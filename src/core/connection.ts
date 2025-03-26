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
                printQRInTerminal: true
            });
            
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
                const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
                
                logger.error(`Conexão fechada devido a: ${(lastDisconnect?.error as Error)?.message}`);
                
                if (shouldReconnect) {
                    logger.info('Tentando reconectar...');
                    await this.initialize();
                } else {
                    logger.info('Desconectado permanentemente.');
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