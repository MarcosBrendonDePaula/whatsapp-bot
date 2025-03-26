import { proto, WASocket } from '@whiskeysockets/baileys';
import config from '../config';
import logger from '../utils/logger';
import { Command, Commands, CommandParams } from '../types';

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
        try {
            const msg = m.messages[0];

            // Ignorar mensagens de notificação e de status
            if (msg.key.remoteJid === 'status@broadcast' || !msg.message) return;

            // Extrair informações da mensagem
            const messageType = Object.keys(msg.message)[0];
            const messageContent = this.extractMessageContent(msg);
            const sender = msg.key.remoteJid!;
            const isGroup = sender.endsWith('@g.us');

            logger.info(`Nova mensagem de ${sender}: ${messageContent}`);

            // Processar comandos
            if (messageContent.startsWith(config.prefix)) {
                const [cmdName, ...args] = messageContent.slice(config.prefix.length).trim().split(' ');
                const commandName = cmdName.toLowerCase();

                if (this.commands.has(commandName)) {
                    const handler = this.commands.get(commandName)!;
                    await handler({
                        sock,
                        msg,
                        sender,
                        args,
                        isGroup,
                        messageContent
                    });
                } else {
                    // Comando desconhecido
                    await sock.sendMessage(sender, {
                        text: `Comando desconhecido. Digite ${config.prefix}ajuda para ver os comandos disponíveis.`
                    });
                }
            }
        } catch (error) {
            logger.error(`Erro ao processar mensagem: ${(error as Error).message}`);
        }
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