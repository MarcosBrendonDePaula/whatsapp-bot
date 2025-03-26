import { proto, WASocket } from '@whiskeysockets/baileys';
import config from '../config';
import logger from '../utils/logger';
import { Command, Commands, CommandParams } from '../types';
import { incrementMessageCount, incrementErrorCount } from '../commands/admin';

class MessageHandler {
    private commands: Map<string, Command> = new Map();

    public registerCommand(name: string, handler: Command): void {
        this.commands.set(name, handler);
    }

    public registerCommands(commandsObject: Commands): void {
        Object.entries(commandsObject).forEach(([name, handler]) => {
            this.registerCommand(name, handler);
        });
    }

    public async handleMessage(m: { messages: proto.IWebMessageInfo[] }, sock: WASocket): Promise<void> {
        if (!m.messages || m.messages.length === 0) {
            logger.warn('Recebido evento de mensagem sem mensagens');
            return;
        }
        
        try {
            const msg = m.messages[0];

            // Ignorar mensagens de notificação e de status
            if (!msg.key || !msg.key.remoteJid || msg.key.remoteJid === 'status@broadcast' || !msg.message) {
                return;
            }
            
            // Incrementar contador de mensagens processadas
            incrementMessageCount();

            // Extrair informações da mensagem
            const messageContent = this.extractMessageContent(msg);
            const sender = msg.key.remoteJid;
            const isGroup = sender.endsWith('@g.us');
            
            // Registrar a mensagem recebida com menos detalhes no log de informações
            const senderShort = this.formatSender(sender);
            logger.info(`Nova mensagem de ${senderShort}: ${messageContent.substring(0, 100)}${messageContent.length > 100 ? '...' : ''}`);
            
            // Registrar detalhes completos no log de debug
            logger.debug(`Detalhes da mensagem - Remetente: ${sender}, Grupo: ${isGroup}, Conteúdo: ${messageContent}`);

            // Processar comandos
            if (messageContent.startsWith(config.prefix)) {
                const [cmdName, ...args] = messageContent.slice(config.prefix.length).trim().split(' ');
                const commandName = cmdName.toLowerCase();

                if (this.commands.has(commandName)) {
                    try {
                        const handler = this.commands.get(commandName)!;
                        logger.debug(`Executando comando: ${commandName} com argumentos: ${args.join(' ')}`);
                        
                        await handler({
                            sock,
                            msg,
                            sender,
                            args,
                            isGroup,
                            messageContent
                        });
                        
                        logger.debug(`Comando ${commandName} executado com sucesso`);
                    } catch (cmdError) {
                        // Incrementar contador de erros
                        incrementErrorCount();
                        
                        logger.error(`Erro ao executar comando ${commandName}: ${(cmdError as Error).message}`, cmdError as Error);
                        
                        // Notificar o usuário sobre o erro
                        try {
                            await sock.sendMessage(sender, {
                                text: `Erro ao executar o comando ${commandName}: ${(cmdError as Error).message}`
                            });
                        } catch (notifyError) {
                            logger.error(`Não foi possível notificar o usuário sobre o erro: ${(notifyError as Error).message}`);
                        }
                    }
                } else {
                    // Comando desconhecido
                    logger.debug(`Comando desconhecido: ${commandName}`);
                    try {
                        await sock.sendMessage(sender, {
                            text: `Comando desconhecido. Digite ${config.prefix}ajuda para ver os comandos disponíveis.`
                        });
                    } catch (notifyError) {
                        logger.error(`Não foi possível enviar mensagem de comando desconhecido: ${(notifyError as Error).message}`);
                    }
                }
            }
        } catch (error) {
            logger.error(`Erro ao processar mensagem: ${(error as Error).message}`, error as Error);
        }
    }
    
    /**
     * Formata o ID do remetente para exibição nos logs
     * @param sender ID do remetente
     * @returns ID formatado
     */
    private formatSender(sender: string): string {
        // Se for um grupo, mostrar apenas o final do ID
        if (sender.endsWith('@g.us')) {
            return `Grupo:${sender.substring(sender.length - 10)}`;
        }
        
        // Se for um contato, mostrar apenas os últimos dígitos
        if (sender.includes('@')) {
            const parts = sender.split('@');
            const number = parts[0];
            return number.substring(Math.max(0, number.length - 4));
        }
        
        return sender;
    }

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
}

export default MessageHandler;
