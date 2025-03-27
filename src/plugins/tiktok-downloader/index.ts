import { proto } from '@whiskeysockets/baileys';
import { BasePlugin } from '../base-plugin';
import { CommandParams } from '../../types';
import logger from '../../utils/logger';
import messageQueue from '../../utils/message-queue';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import * as Tiktok from '@tobyg74/tiktok-api-dl';

// Configurar o caminho para o ffmpeg
if (ffmpegStatic) {
    ffmpeg.setFfmpegPath(ffmpegStatic);
}

/**
 * Plugin para download de vídeos do TikTok
 */
export default class TikTokDownloaderPlugin extends BasePlugin {
    private downloadDir: string;
    private maxFileSize: number; // em MB
    private tiktokCookie: string;
    private downloaderVersion: 'v1' | 'v2' | 'v3';

    constructor() {
        super(
            'tiktok-downloader',
            'Plugin para download de vídeos do TikTok',
            '1.0.0'
        );

        // Diretório para armazenar os downloads temporários
        this.downloadDir = path.resolve('./downloads');

        // Tamanho máximo de arquivo para envio (em MB)
        this.maxFileSize = 50; // WhatsApp geralmente limita a 100MB, mas vamos usar 50MB para segurança

        // Cookie do TikTok (opcional, mas melhora os resultados)
        this.tiktokCookie = process.env.TIKTOK_COOKIE || '';
        
        // Versão do downloader a ser usada (v1, v2 ou v3)
        this.downloaderVersion = (process.env.TIKTOK_DOWNLOADER_VERSION as 'v1' | 'v2' | 'v3') || 'v3';
    }

    /**
     * Método chamado quando o plugin é inicializado
     */
    protected async onInitialize(): Promise<void> {
        // Garantir que o diretório de downloads existe
        if (!fs.existsSync(this.downloadDir)) {
            fs.mkdirSync(this.downloadDir, { recursive: true });
        }

        // Registrar comandos
        this.registerCommand('tkdl', this.downloadCommand.bind(this));
        this.registerCommand('tt', this.downloadCommand.bind(this));
        this.registerCommand('tiktok', this.downloadCommand.bind(this));

        // Registrar listener de mensagens para detectar links do TikTok
        this.setupMessageListener();

        logger.info(`Plugin de download do TikTok inicializado com sucesso (usando downloader ${this.downloaderVersion})`);
    }

    /**
     * Configura o listener de mensagens para detectar links do TikTok
     */
    private setupMessageListener(): void {
        if (!this.sock) {
            logger.error('Socket não disponível para configurar listener de mensagens');
            return;
        }

        // Adicionar listener para todas as mensagens
        this.sock.ev.on('messages.upsert', async (m) => {
            try {
                if (!m.messages || m.messages.length === 0) return;

                const msg = m.messages[0];

                // Ignorar mensagens de notificação e de status
                if (!msg.key || !msg.key.remoteJid || msg.key.remoteJid === 'status@broadcast' || !msg.message) {
                    return;
                }

                // Extrair conteúdo da mensagem
                const messageContent = this.extractMessageContent(msg);
                const sender = msg.key.remoteJid;

                // Verificar se a mensagem contém um link do TikTok
                const tiktokLinks = this.extractTikTokLinks(messageContent);

                if (tiktokLinks.length > 0 && messageContent.toLowerCase().includes('download')) {
                    // Processar apenas o primeiro link encontrado
                    const link = tiktokLinks[0];
                    logger.info(`Link do TikTok detectado: ${link}`);

                    // Fazer o download do vídeo sem enviar mensagem de confirmação
                    await this.downloadAndSendVideo(link, sender);
                }
            } catch (error) {
                logger.error(`Erro ao processar mensagem para download do TikTok: ${(error as Error).message}`, error as Error);
            }
        });
    }

    /**
     * Comando para download de vídeo do TikTok
     */
    private async downloadCommand({ sock, sender, args }: CommandParams): Promise<void> {
        if (args.length === 0) {
            await messageQueue.sendCommandResponse(sender, {
                text: '❌ Por favor, forneça um link do TikTok.\n\nExemplo: !tkdl https://www.tiktok.com/@username/video/1234567890123456789'
            });
            return;
        }

        const url = args[0];

        // Verificar se é um link válido do TikTok
        if (!this.isTikTokUrl(url)) {
            await messageQueue.sendCommandResponse(sender, {
                text: '❌ O link fornecido não é um link válido do TikTok.'
            });
            return;
        }

        // Fazer o download do vídeo sem mensagem de confirmação
        await this.downloadAndSendVideo(url, sender);
    }

    /**
     * Verifica se uma URL é do TikTok
     * @param url URL a ser verificada
     * @returns true se for uma URL do TikTok, false caso contrário
     */
    private isTikTokUrl(url: string): boolean {
        const tiktokRegex = /^(https?:\/\/)?(www\.|vm\.|vt\.)?(tiktok\.com)\/.+$/;
        return tiktokRegex.test(url);
    }

    /**
     * Faz o download do vídeo e envia para o usuário
     * @param url URL do vídeo do TikTok
     * @param recipient ID do destinatário
     */
    private async downloadAndSendVideo(url: string, recipient: string): Promise<void> {
        // Variável para armazenar o timeout de progresso
        let progressTimeout: NodeJS.Timeout | null = null;
        let progressUpdateSent = false;
        
        try {
            // Enviar mensagem de status inicial
            await messageQueue.sendStatus(recipient, {
                text: `⏳ Obtendo informações do vídeo do TikTok...`
            });

            // Obter informações do vídeo usando a biblioteca @tobyg74/tiktok-api-dl
            const options = {
                version: this.downloaderVersion,
                ...(this.tiktokCookie ? { cookie: this.tiktokCookie } : {}),
                showOriginalResponse: true
            };

            // Fazer solicitação para obter dados do vídeo
            const result = await Tiktok.Downloader(url, options);
            
            // Verificar se a requisição foi bem-sucedida
            if (result.status !== 'success') {
                throw new Error(result.message || 'Falha ao obter informações do vídeo');
            }

            // Extrair informações do vídeo
            const videoData = result.result;
            
            // Escolher a melhor qualidade de vídeo disponível (priorizar HD)
            const videoUrl = this.getBestVideoQuality(videoData);
            
            if (!videoUrl) {
                throw new Error('Nenhuma URL de vídeo encontrada');
            }

            // Gerar ID único para o arquivo (usando timestamp)
            const videoId = Date.now().toString();
            //@ts-ignore
            const videoTitle = videoData.desc || 'Vídeo do TikTok';
            const sanitizedTitle = videoTitle.replace(/[^\w\s]/gi, '_').substring(0, 50);
            
            // Caminho do arquivo de saída
            const videoPath = path.join(this.downloadDir, `${videoId}.mp4`);

            // Enviar mensagem de status
            await messageQueue.sendStatus(recipient, {
                text: `⏳ Baixando: ${sanitizedTitle}\n\nIsso pode levar alguns instantes...`
            });
            
            // Definir um tempo aleatório para a próxima atualização de progresso (entre 10 e 30 segundos)
            const nextUpdateTime = Math.floor(Math.random() * (30 - 10 + 1)) + 10;
            
            // Configurar um timeout para enviar uma atualização de progresso
            progressTimeout = setTimeout(async () => {
                // Verificar se o download ainda está em andamento
                progressUpdateSent = true;
                await messageQueue.sendStatus(recipient, {
                    text: `⏳ Ainda baixando: ${sanitizedTitle}\n\nO download está em andamento, por favor continue aguardando...`
                });
            }, nextUpdateTime * 1000);

            // Baixar o vídeo
            logger.info(`Iniciando download do vídeo do TikTok: ${videoId} (URL: ${videoUrl})`);
            
            // Baixar o vídeo com axios
            const response = await axios({
                method: 'GET',
                url: videoUrl,
                responseType: 'stream',
                timeout: 60000, // 60 segundos de timeout
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });

            // Salvar o vídeo
            const writer = fs.createWriteStream(videoPath);
            response.data.pipe(writer);

            await new Promise((resolve, reject) => {
                //@ts-ignore
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            logger.info(`Download concluído: ${videoId}`);

            // Verificar tamanho do arquivo
            const stats = fs.statSync(videoPath);
            const fileSizeMB = stats.size / (1024 * 1024);
            
            if (fileSizeMB > this.maxFileSize) {
                await messageQueue.sendCommandResponse(recipient, {
                    text: `❌ O vídeo é muito grande (${fileSizeMB.toFixed(2)} MB). O tamanho máximo permitido é ${this.maxFileSize} MB.`
                });
                
                // Remover arquivo
                if (fs.existsSync(videoPath)) {
                    fs.unlinkSync(videoPath);
                }
                
                return;
            }

            // Limpar o timeout de progresso
            if (progressTimeout) {
                clearTimeout(progressTimeout);
            }
            
            // Se ainda não enviamos uma atualização de progresso, não precisamos enviar uma mensagem de conclusão
            if (progressUpdateSent) {
                // Enviar mensagem de status antes de enviar o vídeo
                await messageQueue.sendStatus(recipient, {
                    text: `✅ Download concluído! Enviando o vídeo agora...`
                });
                
                // Aguardar um pouco antes de enviar o vídeo para evitar muitas mensagens em sequência
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            // Obter informações do autor
            //@ts-ignore
            const authorName = videoData.author?.nickname || 'desconhecido';
            //@ts-ignore
            const authorUsername = videoData.author?.nickname?.replace('@', '') || 'desconhecido';

            // Enviar o vídeo
            await messageQueue.sendMessage(recipient, {
                video: fs.readFileSync(videoPath),
                caption: `📱 *TikTok de ${authorName}*\n\n${videoTitle}\n\n✨ Baixado com alta qualidade\n\n🔗 ${url}`,
                fileName: `${sanitizedTitle}.mp4`
            });
            
            // Remover arquivo após envio
            if (fs.existsSync(videoPath)) {
                fs.unlinkSync(videoPath);
            }
            
            logger.info(`Vídeo do TikTok enviado com sucesso: ${videoId}`);
        } catch (error) {
            logger.error(`Erro ao baixar vídeo do TikTok: ${(error as Error).message}`, error as Error);
            
            // Limpar o timeout de progresso se existir
            if (progressTimeout) {
                clearTimeout(progressTimeout);
            }
            
            // Enviar mensagem de erro
            await messageQueue.sendCommandResponse(recipient, {
                text: `❌ Erro ao baixar o vídeo do TikTok: ${(error as Error).message}`
            });
        }
    }

    /**
     * Obtém a URL de vídeo com a melhor qualidade disponível
     * @param data Dados retornados pela API
     * @returns URL do vídeo com a melhor qualidade
     */
    private getBestVideoQuality(data: any): string | null {
        try {
            // Com base na resposta do exemplo, verificar se temos versão HD disponível
            if (data.videoHD) {
                logger.info('Usando versão HD do vídeo');
                return data.videoHD;
            }
            
            // Se não tem HD, tentar versão SD
            if (data.videoSD) {
                logger.info('Usando versão SD do vídeo');
                return data.videoSD;
            }
            
            // Se não tem SD, tentar outras URLs disponíveis
            if (data.video) {
                // Se for array, pegar o primeiro item
                if (Array.isArray(data.video)) {
                    logger.info('Usando primeiro item do array de vídeos');
                    return data.video[0];
                }
                // Se for string
                if (typeof data.video === 'string') {
                    logger.info('Usando URL de vídeo direta');
                    return data.video;
                }
            }
            
            // Por último, tentar versão com marca d'água (se todas as outras opções falharem)
            if (data.videoWatermark) {
                logger.info('Usando versão com marca d\'água do vídeo (última opção)');
                return data.videoWatermark;
            }
            
            // Se chegou aqui, não encontrou nenhuma URL válida
            logger.error('Nenhuma URL de vídeo encontrada nos dados retornados');
            return null;
        } catch (error) {
            logger.error(`Erro ao extrair URL do vídeo: ${(error as Error).message}`);
            return null;
        }
    }
    
    /**
     * Extrai links do TikTok de uma mensagem
     * @param text Texto da mensagem
     * @returns Array de links do TikTok encontrados
     */
    private extractTikTokLinks(text: string): string[] {
        const tiktokRegex = /(?:https?:\/\/)?(?:www\.|vm\.|vt\.)?tiktok\.com\/(?:@[\w.-]+\/video\/\d+|[\w.-]+\/?)(?:\S+)?/g;
        const matches = text.match(tiktokRegex);
        return matches ? matches : [];
    }
    
    /**
     * Extrai o conteúdo da mensagem
     * @param msg Mensagem do WhatsApp
     * @returns Conteúdo da mensagem
     */
    private extractMessageContent(msg: proto.IWebMessageInfo): string {
        if (!msg.message) return '';

        if (msg.message.conversation) {
            return msg.message.conversation;
        } else if (msg.message.extendedTextMessage) {
            return msg.message.extendedTextMessage.text || '';
        } else {
            return '';
        }
    }
    
    /**
     * Método chamado quando o bot é desligado
     */
    public async onShutdown(): Promise<void> {
        logger.info('Plugin de download do TikTok está sendo desligado');
        
        // Limpar diretório de downloads
        try {
            if (fs.existsSync(this.downloadDir)) {
                const files = fs.readdirSync(this.downloadDir);
                for (const file of files) {
                    fs.unlinkSync(path.join(this.downloadDir, file));
                }
            }
        } catch (error) {
            logger.error(`Erro ao limpar diretório de downloads: ${(error as Error).message}`);
        }
        
        await super.onShutdown();
    }
}