import { proto, WASocket } from '@whiskeysockets/baileys';
import config from '../config';
import logger from '../utils/logger';
import { Command, Commands, CommandParams, StateCommandParams } from '../types';
import { incrementMessageCount, incrementErrorCount } from '../commands/admin';
import stateManager from './state-manager';

class MessageHandler {
    private commands: Map<string, Command> = new Map();

    public registerCommand(name: string, handler: Command): void {
        logger.debug(`Registrando comando: ${name}`);
        this.commands.set(name, handler);
    }

    public registerCommands(commandsObject: Commands): void {
        logger.debug(`Registrando ${Object.keys(commandsObject).length} comandos`);
        Object.entries(commandsObject).forEach(([name, handler]) => {
            this.registerCommand(name, handler);
        });
        
        // Listar todos os comandos registrados
        const allCommands = Array.from(this.commands.keys());
        logger.debug(`Total de comandos registrados: ${allCommands.length}`);
        logger.debug(`Comandos disponíveis: ${allCommands.join(', ')}`);
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

            // Verificar se o usuário está em um estado
            const userState = stateManager.getState(sender);
            
            // Se o usuário estiver em um estado, processar a mensagem de acordo com o estado
            if (userState) {
                logger.debug(`Usuário ${sender} está no estado ${userState.currentState} do plugin ${userState.pluginName}`);
                
                // Atualizar a data de última atualização do estado
                userState.updatedAt = new Date().toISOString();
                stateManager.setState(sender, userState);
                
                // Verificar se há um comando para o estado atual
                const stateCommandName = `state:${userState.pluginName}:${userState.currentState}`;
                
                if (this.commands.has(stateCommandName)) {
                    try {
                        const handler = this.commands.get(stateCommandName)!;
                        logger.debug(`Executando manipulador de estado: ${stateCommandName}`);
                        
                        // Criar funções auxiliares para manipulação de estado
                        const createState = (initialState: string, data?: Record<string, any>) => {
                            stateManager.createState(sender, userState.pluginName, initialState, data);
                        };
                        
                        const updateState = (newState: string, data?: Record<string, any>) => {
                            return stateManager.updateState(sender, newState, data);
                        };
                        
                        const clearState = () => {
                            return stateManager.clearState(sender);
                        };
                        
                        // Executar o manipulador com os parâmetros estendidos
                        await handler({
                            sock,
                            msg,
                            sender,
                            args: messageContent.split(' '),
                            isGroup,
                            messageContent,
                            state: userState,
                            createState,
                            updateState,
                            clearState
                        } as StateCommandParams);
                        
                        logger.debug(`Manipulador de estado ${stateCommandName} executado com sucesso`);
                        
                        // Se a mensagem foi processada pelo manipulador de estado, não processar como comando normal
                        return;
                    } catch (stateError) {
                        // Incrementar contador de erros
                        incrementErrorCount();
                        
                        logger.error(`Erro ao executar manipulador de estado ${stateCommandName}: ${(stateError as Error).message}`, stateError as Error);
                        
                        // Notificar o usuário sobre o erro
                        try {
                            await sock.sendMessage(sender, {
                                text: `Erro ao processar sua mensagem: ${(stateError as Error).message}`
                            });
                        } catch (notifyError) {
                            logger.error(`Não foi possível notificar o usuário sobre o erro: ${(notifyError as Error).message}`);
                        }
                        
                        return;
                    }
                } else {
                    logger.debug(`Nenhum manipulador encontrado para o estado ${stateCommandName}, processando como mensagem normal`);
                }
            }
            
            // Verificar se é uma resposta a um botão ou lista
            const buttonResponse = msg.message?.buttonsResponseMessage;
            const listResponse = msg.message?.listResponseMessage;
            
            if (buttonResponse || listResponse) {
                logger.debug(`Recebida resposta interativa: ${buttonResponse?.selectedButtonId || listResponse?.singleSelectReply?.selectedRowId}`);
                
                // Obter o ID do botão ou item da lista selecionado
                const selectedId = buttonResponse?.selectedButtonId || listResponse?.singleSelectReply?.selectedRowId;
                
                if (selectedId) {
                    // Enviar uma mensagem de confirmação
                    await sock.sendMessage(sender, {
                        text: `Você selecionou: ${buttonResponse?.selectedDisplayText || listResponse?.title || selectedId}`
                    });
                    
                    // Aqui você pode adicionar lógica para processar diferentes botões/itens
                    // Por exemplo, criar um estado baseado na seleção
                    
                    return; // Não processar como comando normal
                }
            }
            
            // Verificar se é uma resposta a uma enquete
            // Nota: O tipo pollResponseMessage pode não estar definido na versão atual do Baileys
            // Esta é uma implementação para futuras versões que possam suportar
            const pollResponse = (msg.message as any)?.pollResponseMessage;
            if (pollResponse) {
                logger.debug(`Recebida resposta de enquete: ${JSON.stringify(pollResponse.selectedOptions)}`);
                
                // Aqui você pode adicionar lógica para processar respostas de enquetes
                
                return; // Não processar como comando normal
            }
            
            // Processar comandos normais
            if (messageContent.startsWith(config.prefix)) {
                const [cmdName, ...args] = messageContent.slice(config.prefix.length).trim().split(' ');
                const commandName = cmdName.toLowerCase();

                logger.debug(`Procurando comando: ${commandName}`);
                logger.debug(`Comandos disponíveis: ${Array.from(this.commands.keys()).join(', ')}`);
                
                if (this.commands.has(commandName)) {
                    logger.debug(`Comando ${commandName} encontrado`);
                    try {
                        const handler = this.commands.get(commandName)!;
                        logger.debug(`Executando comando: ${commandName} com argumentos: ${args.join(' ')}`);
                        
                        // Verificar se o comando suporta estados
                        const isStateCommand = handler.length > 1;
                        
                        if (isStateCommand) {
                            // Criar funções auxiliares para manipulação de estado
                            const createState = (initialState: string, data?: Record<string, any>) => {
                                // Obter o nome do plugin do comando
                                const pluginName = commandName.split(':')[0] || 'core';
                                stateManager.createState(sender, pluginName, initialState, data);
                            };
                            
                            const updateState = (newState: string, data?: Record<string, any>) => {
                                return userState ? stateManager.updateState(sender, newState, data) : false;
                            };
                            
                            const clearState = () => {
                                return stateManager.clearState(sender);
                            };
                            
                            // Executar o manipulador com os parâmetros estendidos
                            await handler({
                                sock,
                                msg,
                                sender,
                                args,
                                isGroup,
                                messageContent,
                                state: userState,
                                createState,
                                updateState,
                                clearState
                            } as StateCommandParams);
                        } else {
                            // Executar o manipulador com os parâmetros normais
                            await handler({
                                sock,
                                msg,
                                sender,
                                args,
                                isGroup,
                                messageContent
                            });
                        }
                        
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
        } else if (msg.message.buttonsResponseMessage) {
            return msg.message.buttonsResponseMessage.selectedDisplayText || '';
        } else if (msg.message.listResponseMessage) {
            return msg.message.listResponseMessage.title || '';
        } else {
            // Para outros tipos de mensagem, retornar string vazia
            // Pode ser expandido para lidar com outros tipos de mensagem
            return '';
        }
    }
}

export default MessageHandler;
