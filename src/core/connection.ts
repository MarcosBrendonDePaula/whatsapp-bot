import {
    DisconnectReason,
    useMultiFileAuthState,
    WASocket,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    makeWASocket
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import * as qrcode from 'qrcode-terminal';
import * as fs from 'fs';
import * as path from 'path';
import config from '../config';
import logger from '../utils/logger';
import MessageHandler from './message-handler';

// Definir a interface do logger localmente com base no que é esperado pelo Baileys
interface Logger {
    info: (info: any) => void;
    debug: (info: any) => void;
    warn: (info: any) => void;
    error: (info: any) => void;
    trace: (info: any) => void;
    child: (info: any) => Logger;
    level: string;
}

class Connection {
    private sock: WASocket | null = null;
    private messageHandler: MessageHandler | null = null;

    public setMessageHandler(handler: MessageHandler): void {
        this.messageHandler = handler;
    }

    /**
     * Limpa os arquivos de sessão para forçar uma nova autenticação
     */
    private clearSession(): void {
        try {
            const sessionDir = path.resolve(config.sessionPath);
            if (fs.existsSync(sessionDir)) {
                logger.info(`Limpando arquivos de sessão em ${sessionDir}`);
                
                // Ler todos os arquivos no diretório
                const files = fs.readdirSync(sessionDir);
                
                // Excluir cada arquivo
                for (const file of files) {
                    const filePath = path.join(sessionDir, file);
                    fs.unlinkSync(filePath);
                    logger.debug(`Arquivo de sessão removido: ${filePath}`);
                }
                
                logger.info('Arquivos de sessão limpos com sucesso');
            }
        } catch (error) {
            logger.error(`Erro ao limpar arquivos de sessão: ${(error as Error).message}`, error as Error);
        }
    }

    public async initialize(): Promise<WASocket> {
        try {
            // Garantir que o diretório de sessão existe
            const sessionDir = path.resolve(config.sessionPath);
            if (!fs.existsSync(sessionDir)) {
                fs.mkdirSync(sessionDir, { recursive: true });
            }

            // Obter a versão mais recente do Baileys
            const { version, isLatest } = await fetchLatestBaileysVersion();
            logger.info(`Usando WA v${version.join('.')}, isLatest: ${isLatest}`);

            // Autenticação
            const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
            
            // Criar um objeto que implementa a interface Logger
            const loggerImplementation: Logger = {
                info: (info: any) => { logger.info(typeof info === 'string' ? info : JSON.stringify(info)) },
                debug: (info: any) => { logger.debug(typeof info === 'string' ? info : JSON.stringify(info)) },
                warn: (info: any) => { logger.warn(typeof info === 'string' ? info : JSON.stringify(info)) },
                error: (info: any) => { logger.error(typeof info === 'string' ? info : JSON.stringify(info)) },
                trace: (info: any) => { logger.debug(`TRACE: ${typeof info === 'string' ? info : JSON.stringify(info)}`) },
                // Implementação mínima de child para satisfazer a interface
                child: () => loggerImplementation,
                // Nível padrão de log
                level: 'info'
            };
            
            // Criar conexão
            this.sock = makeWASocket({
                version,
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, loggerImplementation)
                },
                printQRInTerminal: true,
                // Forçar exibição do QR code se não houver credenciais válidas
                browser: ['Ubuntu', 'Chrome', '22.04.4']
            });
            
            // Verificar se há credenciais válidas
            if (!state.creds.me) {
                logger.info('Nenhuma sessão válida encontrada. Aguardando QR code...');
            }
            
            // Salvar credenciais quando atualizadas
            this.sock.ev.on('creds.update', saveCreds);
            
            // Configurar handlers de eventos
            this.setupConnectionHandler();
            this.setupMessageHandler();
            
            return this.sock;
        } catch (error) {
            logger.error(`Erro ao inicializar a conexão: ${error}`);
            throw error;
        }
    }

    private setupConnectionHandler(): void {
        if (!this.sock) return;

        this.sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;
            
            // Se o QR code estiver disponível, exibir no terminal
            if (qr) {
                logger.info('QR Code gerado, escaneie para conectar:');
                qrcode.generate(qr, { small: true });
            }
            
            // Lidar com a conexão
            if (connection === 'close') {
                try {
                    const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
                    const errorMessage = (lastDisconnect?.error as Error)?.message || 'Erro desconhecido';
                    
                    logger.error(`Conexão fechada devido a: ${errorMessage} (código: ${statusCode})`);
                    
                    // Verificar se devemos reconectar
                    // Tentar reconectar em todos os casos, exceto quando for explicitamente desconectado (loggedOut)
                    const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                    
                    logger.debug(`Código de status: ${statusCode}, DisconnectReason.loggedOut: ${DisconnectReason.loggedOut}, Reconectar: ${shouldReconnect}`);
                    
                    // Adicionar atraso antes de reconectar para evitar loop de reconexão rápida
                    if (shouldReconnect) {
                        // Se for um erro de autenticação (401), limpar a sessão antes de tentar novamente
                        if (statusCode === 401) {
                            logger.info('Erro de autenticação detectado, limpando arquivos de sessão...');
                            this.clearSession();
                        }
                        
                        logger.info('Tentando reconectar em 5 segundos...');
                        
                        // Esperar 5 segundos antes de tentar reconectar
                        await new Promise(resolve => setTimeout(resolve, 5000));
                        
                        // Tentar reconectar
                        await this.initialize();
                    } else {
                        logger.info('Desconectado permanentemente.');
                    }
                } catch (error) {
                    logger.error(`Erro durante a reconexão: ${(error as Error).message}`, error as Error);
                    
                    // Se falhar na reconexão, tentar novamente após um tempo maior
                    logger.info('Tentando reconectar novamente em 30 segundos...');
                    setTimeout(() => {
                        this.initialize().catch(err => {
                            logger.error(`Falha na reconexão: ${(err as Error).message}`, err as Error);
                        });
                    }, 30000);
                }
            } else if (connection === 'open') {
                logger.info('Conexão estabelecida com sucesso!');
            }
        });
    }

    private setupMessageHandler(): void {
        if (!this.sock) return;

        this.sock.ev.on('messages.upsert', async (m) => {
            if (this.messageHandler) {
                await this.messageHandler.handleMessage(m, this.sock!);
            } else {
                logger.warn('Message handler não configurado');
            }
        });
    }
}

export default Connection;
