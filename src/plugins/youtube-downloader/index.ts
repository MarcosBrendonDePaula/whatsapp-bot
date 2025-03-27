import { proto } from '@whiskeysockets/baileys';
import { BasePlugin } from '../base-plugin';
import { CommandParams } from '../../types';
import logger from '../../utils/logger';
import messageQueue from '../../utils/message-queue';
import * as fs from 'fs';
import * as path from 'path';
import youtubeDl from 'youtube-dl-exec';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';

// Configurar o caminho para o ffmpeg
if (ffmpegStatic) {
    ffmpeg.setFfmpegPath(ffmpegStatic);
}

// Interface para as informações do vídeo
interface VideoInfo {
    title: string;
    id: string;
    duration: string;
    view_count: number;
    upload_date: string;
    formats: Array<{
        format_id: string;
        url: string;
        ext: string;
        format: string;
    }>;
    [key: string]: any;
}

/**
 * Plugin para download de vídeos do YouTube
 */
export default class YoutubeDownloaderPlugin extends BasePlugin {
    private downloadDir: string;
    private maxFileSize: number; // em MB

    constructor() {
        super(
            'youtube-downloader',
            'Plugin para download de vídeos do YouTube',
            '1.0.0'
        );

        // Diretório para armazenar os downloads temporários
        this.downloadDir = path.resolve('./downloads');

        // Tamanho máximo de arquivo para envio (em MB)
        this.maxFileSize = 50; // WhatsApp geralmente limita a 100MB, mas vamos usar 50MB para segurança
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
        this.registerCommand('ytdl', this.downloadCommand.bind(this));
        this.registerCommand('youtube', this.downloadCommand.bind(this));

        // Registrar listener de mensagens para detectar links do YouTube
        this.setupMessageListener();

        logger.info('Plugin de download do YouTube inicializado com sucesso');
    }

    /**
     * Configura o listener de mensagens para detectar links do YouTube
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

                // Verificar se a mensagem contém um link do YouTube
                const youtubeLinks = this.extractYoutubeLinks(messageContent);

                if (youtubeLinks.length > 0 && messageContent.toLowerCase().includes('download')) {
                    // Processar apenas o primeiro link encontrado
                    const link = youtubeLinks[0];
                    logger.info(`Link do YouTube detectado: ${link}`);

                    // Fazer o download do vídeo sem enviar mensagem de confirmação
                    await this.downloadAndSendVideo(link, sender);
                }
            } catch (error) {
                logger.error(`Erro ao processar mensagem para download do YouTube: ${(error as Error).message}`, error as Error);
            }
        });
    }

    /**
     * Comando para download de vídeo do YouTube
     */
    private async downloadCommand({ sock, sender, args }: CommandParams): Promise<void> {
        if (args.length === 0) {
            await messageQueue.sendCommandResponse(sender, {
                text: '❌ Por favor, forneça um link do YouTube.\n\nExemplo: !ytdl https://www.youtube.com/watch?v=dQw4w9WgXcQ'
            });
            return;
        }

        const url = args[0];

        // Verificar se é um link válido do YouTube
        if (!this.isYoutubeUrl(url)) {
            await messageQueue.sendCommandResponse(sender, {
                text: '❌ O link fornecido não é um link válido do YouTube.'
            });
            return;
        }

        // Fazer o download do vídeo sem mensagem de confirmação
        await this.downloadAndSendVideo(url, sender);
    }

    /**
     * Verifica se uma URL é do YouTube
     * @param url URL a ser verificada
     * @returns true se for uma URL do YouTube, false caso contrário
     */
    private isYoutubeUrl(url: string): boolean {
        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
        return youtubeRegex.test(url);
    }

    /**
     * Faz o download do vídeo e envia para o usuário
     * @param url URL do vídeo do YouTube
     * @param recipient ID do destinatário
     */
    private async downloadAndSendVideo(url: string, recipient: string): Promise<void> {
        // Variável para armazenar o timeout de progresso
        let progressTimeout: NodeJS.Timeout | null = null;
        let progressUpdateSent = false;
        
        try {
            // Obter informações do vídeo
            const videoInfo = await youtubeDl(url, {
                dumpSingleJson: true,
                noWarnings: true,
                preferFreeFormats: true,
                youtubeSkipDashManifest: true
            }) as unknown as VideoInfo;
            
            // Extrair informações do vídeo
            const videoTitle = videoInfo.title.replace(/[^\w\s]/gi, '_');
            const videoId = videoInfo.id;
            const videoDuration = parseInt(videoInfo.duration);
            const videoViews = videoInfo.view_count;
            const videoUploadDate = videoInfo.upload_date;
            
            // Verificar duração do vídeo (limitar a 10 minutos)
            if (videoDuration > 600) {
                await messageQueue.sendCommandResponse(recipient, {
                    text: `❌ O vídeo é muito longo (${Math.floor(videoDuration / 60)} minutos). Por favor, escolha um vídeo com no máximo 10 minutos.`
                });
                return;
            }

            // Caminho do arquivo de saída
            const videoPath = path.join(this.downloadDir, `${videoId}.mp4`);

            // Enviar mensagem de status
            await messageQueue.sendStatus(recipient, {
                text: `⏳ Baixando: ${videoTitle}\n\nIsso pode levar alguns minutos dependendo do tamanho do vídeo...`
            });
            
            // Definir um tempo aleatório para a próxima atualização de progresso (entre 15 e 50 segundos)
            const nextUpdateTime = Math.floor(Math.random() * (50 - 15 + 1)) + 15;
            
            // Configurar um timeout para enviar uma atualização de progresso
            progressTimeout = setTimeout(async () => {
                // Verificar se o download ainda está em andamento
                progressUpdateSent = true;
                await messageQueue.sendStatus(recipient, {
                    text: `⏳ Ainda baixando: ${videoTitle}\n\nO download está em andamento, por favor continue aguardando...`
                });
            }, nextUpdateTime * 1000);

            // Baixar o vídeo
            logger.info(`Iniciando download do vídeo: ${videoTitle}`);
            
            // Baixar o vídeo com youtube-dl
            await youtubeDl(url, {
                output: `${this.downloadDir}/${videoId}.%(ext)s`,
                format: 'best[ext=mp4]/best',
                noWarnings: true,
                preferFreeFormats: true,
                youtubeSkipDashManifest: true
            });

            logger.info(`Download concluído: ${videoTitle}`);

            // Verificar se o arquivo existe
            if (!fs.existsSync(videoPath)) {
                // Tentar encontrar o arquivo com outra extensão
                const files = fs.readdirSync(this.downloadDir);
                const videoFile = files.find(file => file.startsWith(videoId));
                
                if (!videoFile) {
                    throw new Error('O arquivo de vídeo não foi criado corretamente');
                }
                
                // Renomear o arquivo para .mp4
                const originalPath = path.join(this.downloadDir, videoFile);
                fs.renameSync(originalPath, videoPath);
            }

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
                    text: `✅ Download concluído! Enviando o vídeo "${videoTitle}" agora...`
                });
                
                // Aguardar um pouco antes de enviar o vídeo para evitar muitas mensagens em sequência
                await new Promise(resolve => setTimeout(resolve, 3000));
            }

            // Formatar a data de upload (YYYYMMDD -> DD/MM/YYYY)
            let formattedDate = videoUploadDate;
            if (videoUploadDate && videoUploadDate.length === 8) {
                const year = videoUploadDate.substring(0, 4);
                const month = videoUploadDate.substring(4, 6);
                const day = videoUploadDate.substring(6, 8);
                formattedDate = `${day}/${month}/${year}`;
            }

            // Enviar o vídeo
            await messageQueue.sendMessage(recipient, {
                video: fs.readFileSync(videoPath),
                caption: `🎬 *${videoTitle}*\n\n⏱️ Duração: ${this.formatDuration(videoDuration)}\n📅 Publicado: ${formattedDate || 'Desconhecido'}\n👁️ Visualizações: ${videoViews || '0'}\n\n🔗 ${url}`,
                fileName: `${videoTitle}.mp4`
            });
            
            // Remover arquivo após envio
            if (fs.existsSync(videoPath)) {
                fs.unlinkSync(videoPath);
            }
            
            logger.info(`Vídeo enviado com sucesso: ${videoTitle}`);
        } catch (error) {
            logger.error(`Erro ao baixar vídeo do YouTube: ${(error as Error).message}`, error as Error);
            
            // Limpar o timeout de progresso se existir
            if (progressTimeout) {
                clearTimeout(progressTimeout);
            }
            
            // Enviar mensagem de erro (sem sugerir tentar novamente mais tarde)
            await messageQueue.sendCommandResponse(recipient, {
                text: `❌ Erro ao baixar o vídeo: ${(error as Error).message}`
            });
        }
    }
    
    /**
     * Extrai links do YouTube de uma mensagem
     * @param text Texto da mensagem
     * @returns Array de links do YouTube encontrados
     */
    private extractYoutubeLinks(text: string): string[] {
        const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]+)(?:\S+)?/g;
        const matches = text.match(youtubeRegex);
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
     * Formata a duração do vídeo
     * @param seconds Duração em segundos
     * @returns Duração formatada (HH:MM:SS)
     */
    private formatDuration(seconds: number): string {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
    }
    
    /**
     * Método chamado quando o bot é desligado
     */
    public async onShutdown(): Promise<void> {
        logger.info('Plugin de download do YouTube está sendo desligado');
        
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
