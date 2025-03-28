import { proto, WASocket } from '@whiskeysockets/baileys';
import { BasePlugin } from '../base-plugin';
import { CommandParams } from '../../types';
import logger from '../../utils/logger';
import aiConfig, { ChatAIConfig } from './config';
import aiUtils from './ai-utils';

/**
 * Plugin para assistente de IA usando OpenAI
 */
export default class AIAssistantPlugin extends BasePlugin {
    constructor() {
        super(
            'ai-assistant',
            'Assistente de IA usando OpenAI',
            '1.0.0'
        );
    }
    
    /**
     * Método chamado quando o plugin é inicializado
     */
    protected async onInitialize(): Promise<void> {
        // Registrar comandos
        this.registerCommand('ai', this.aiCommand.bind(this));
        
        // Registrar handler de estado para configuração
        this.registerCommand('state:ai-assistant:config', this.handleConfigState.bind(this));
        
        logger.info('Plugin de assistente de IA inicializado com sucesso');
    }
    
    /**
     * Comando principal para gerenciar o assistente de IA
     */
    private async aiCommand(params: CommandParams): Promise<void> {
        const { sock, sender, args, isGroup } = params;
        
        if (args.length === 0) {
            await this.showHelp(sock, sender);
            return;
        }
        
        const subcommand = args[0].toLowerCase();
        
        switch (subcommand) {
            case 'on':
            case 'ativar':
                await this.enableAI(sock, sender);
                break;
                
            case 'off':
            case 'desativar':
                await this.disableAI(sock, sender);
                break;
                
            case 'status':
                await this.showStatus(sock, sender);
                break;
                
            case 'apikey':
                await this.setApiKey(sock, sender, args.slice(1).join(' '));
                break;
                
            case 'modelo':
            case 'model':
                await this.setModel(sock, sender, args.slice(1).join(' '));
                break;
                
            case 'nome':
            case 'name':
                await this.setBotName(sock, sender, args.slice(1).join(' '));
                break;
                
            case 'mencao':
            case 'mention':
                await this.setMentionMode(sock, sender, args.slice(1).join(' '));
                break;
                
            case 'limpar':
            case 'clear':
                await this.clearHistory(sock, sender);
                break;
                
            case 'config':
                await this.startConfig(sock, sender, params);
                break;
                
            case 'modelos':
            case 'models':
                await this.showModels(sock, sender);
                break;
                
            case 'prompt':
                if (isGroup) {
                    await sock.sendMessage(sender, {
                        text: '⚠️ Este comando só pode ser usado em conversas privadas por motivos de segurança.'
                    });
                    return;
                }
                await this.setSystemPrompt(sock, sender, args.slice(1).join(' '));
                break;
                
            case 'teste':
            case 'test':
                await this.testAI(sock, sender, args.slice(1).join(' '));
                break;
                
            default:
                await this.showHelp(sock, sender);
                break;
        }
    }
    
    /**
     * Mostra a ajuda do comando
     */
    private async showHelp(sock: WASocket, sender: string): Promise<void> {
        const message = `🤖 *Assistente de IA - Comandos*

*!ai on* - Ativa o assistente de IA
*!ai off* - Desativa o assistente de IA
*!ai status* - Mostra o status atual
*!ai apikey [chave]* - Define a chave de API do OpenAI
*!ai model [modelo]* - Define o modelo a ser usado
*!ai name [nome]* - Define o nome do bot
*!ai mention [on/off]* - Define se o bot responde apenas quando mencionado
*!ai clear* - Limpa o histórico de conversa
*!ai config* - Inicia o assistente de configuração
*!ai models* - Lista os modelos disponíveis
*!ai prompt [texto]* - Define o prompt do sistema (apenas em privado)
*!ai test [mensagem]* - Testa o assistente com uma mensagem específica

O assistente de IA responderá automaticamente quando mencionado pelo nome (ou com @nome) ou quando detectar que está sendo chamado.`;
        
        await sock.sendMessage(sender, { text: message });
    }
    
    /**
     * Ativa o assistente de IA
     */
    private async enableAI(sock: WASocket, sender: string): Promise<void> {
        aiConfig.enableAI(sender);
        
        await sock.sendMessage(sender, {
            text: '✅ Assistente de IA ativado com sucesso!'
        });
    }
    
    /**
     * Desativa o assistente de IA
     */
    private async disableAI(sock: WASocket, sender: string): Promise<void> {
        aiConfig.disableAI(sender);
        
        await sock.sendMessage(sender, {
            text: '❌ Assistente de IA desativado.'
        });
    }
    
    /**
     * Mostra o status atual do assistente
     */
    private async showStatus(sock: WASocket, sender: string): Promise<void> {
        const config = aiConfig.getChatConfig(sender);
        const apiKey = aiConfig.getApiKey(sender);
        
        const message = `🤖 *Status do Assistente de IA*

*Ativado:* ${config.enabled ? '✅ Sim' : '❌ Não'}
*Modelo:* ${config.model}
*Nome do Bot:* ${config.botName}
*Responder apenas quando mencionado:* ${config.replyOnlyWhenMentioned ? '✅ Sim' : '❌ Não'}
*Chave de API:* ${apiKey ? '✅ Configurada' : '❌ Não configurada'}
*Temperatura:* ${config.temperature}
*Tokens máximos:* ${config.maxTokens}
*Última utilização:* ${new Date(config.lastUsed).toLocaleString()}`;
        
        await sock.sendMessage(sender, { text: message });
    }
    
    /**
     * Define a chave de API do OpenAI
     */
    private async setApiKey(sock: WASocket, sender: string, apiKey: string): Promise<void> {
        if (!apiKey) {
            await sock.sendMessage(sender, {
                text: '⚠️ Por favor, forneça uma chave de API válida.\n\nExemplo: !ai apikey sk-...'
            });
            return;
        }
        
        // Verificar formato básico da chave
        if (!apiKey.startsWith('sk-')) {
            await sock.sendMessage(sender, {
                text: '⚠️ A chave de API parece inválida. Ela deve começar com "sk-".'
            });
            return;
        }
        
        aiConfig.setApiKey(sender, apiKey);
        
        await sock.sendMessage(sender, {
            text: '🔑 Chave de API configurada com sucesso!'
        });
    }
    
    /**
     * Define o modelo a ser usado
     */
    private async setModel(sock: WASocket, sender: string, model: string): Promise<void> {
        if (!model) {
            await sock.sendMessage(sender, {
                text: '⚠️ Por favor, forneça um modelo válido.\n\nExemplo: !ai model gpt-4\n\nUse !ai models para ver os modelos disponíveis.'
            });
            return;
        }
        
        const availableModels = aiUtils.getAvailableModels();
        
        if (!availableModels.includes(model)) {
            await sock.sendMessage(sender, {
                text: `⚠️ Modelo inválido: ${model}\n\nModelos disponíveis:\n${availableModels.join('\n')}`
            });
            return;
        }
        
        aiConfig.setModel(sender, model);
        
        await sock.sendMessage(sender, {
            text: `🤖 Modelo alterado para: ${model}`
        });
    }
    
    /**
     * Define o nome do bot
     */
    private async setBotName(sock: WASocket, sender: string, name: string): Promise<void> {
        if (!name) {
            await sock.sendMessage(sender, {
                text: '⚠️ Por favor, forneça um nome para o bot.\n\nExemplo: !ai name Assistente'
            });
            return;
        }
        
        aiConfig.setBotName(sender, name);
        
        await sock.sendMessage(sender, {
            text: `👋 O nome do bot foi alterado para: ${name}`
        });
    }
    
    /**
     * Define se o bot responde apenas quando mencionado
     */
    private async setMentionMode(sock: WASocket, sender: string, mode: string): Promise<void> {
        if (!mode) {
            await sock.sendMessage(sender, {
                text: '⚠️ Por favor, especifique on ou off.\n\nExemplo: !ai mention on'
            });
            return;
        }
        
        const enableMention = mode.toLowerCase() === 'on' || mode.toLowerCase() === 'true';
        
        aiConfig.setReplyOnlyWhenMentioned(sender, enableMention);
        
        await sock.sendMessage(sender, {
            text: enableMention 
                ? '✅ O bot agora responderá apenas quando mencionado pelo nome.'
                : '✅ O bot agora responderá a todas as mensagens.'
        });
    }
    
    /**
     * Limpa o histórico de conversa
     */
    private async clearHistory(sock: WASocket, sender: string): Promise<void> {
        aiUtils.clearHistory(sender);
        
        await sock.sendMessage(sender, {
            text: '🧹 Histórico de conversa limpo com sucesso!'
        });
    }
    
    /**
     * Inicia o assistente de configuração
     */
    private async startConfig(sock: WASocket, sender: string, params: CommandParams): Promise<void> {
        const { createState } = params as any;
        
        if (!createState) {
            await sock.sendMessage(sender, {
                text: '⚠️ Erro ao iniciar o assistente de configuração.'
            });
            return;
        }
        
        // Iniciar estado de configuração
        createState('config');
        
        await sock.sendMessage(sender, {
            text: `🤖 *Assistente de Configuração de IA*

Vamos configurar o assistente de IA passo a passo.

1️⃣ Primeiro, você deseja ativar o assistente de IA? (sim/não)`
        });
    }
    
    /**
     * Manipula o estado de configuração
     */
    private async handleConfigState(params: CommandParams): Promise<void> {
        const { sock, sender, messageContent, state, updateState, clearState } = params as any;
        
        if (!state || !updateState || !clearState) {
            await sock.sendMessage(sender, {
                text: '⚠️ Erro ao processar a configuração.'
            });
            return;
        }
        
        const currentConfig = aiConfig.getChatConfig(sender);
        const step = state.data?.step || 1;
        const newConfig: Partial<ChatAIConfig> = state.data?.config || {};
        
        switch (step) {
            case 1: // Ativar/desativar
                const enableResponse = messageContent.toLowerCase();
                if (enableResponse === 'sim' || enableResponse === 's' || enableResponse === 'yes' || enableResponse === 'y') {
                    newConfig.enabled = true;
                } else {
                    newConfig.enabled = false;
                }
                
                updateState('config', {
                    step: 2,
                    config: newConfig
                });
                
                await sock.sendMessage(sender, {
                    text: `2️⃣ Qual modelo você deseja usar? (Atual: ${currentConfig.model})

Opções disponíveis:
${aiUtils.getAvailableModels().join('\n')}`
                });
                break;
                
            case 2: // Modelo
                const model = messageContent.trim();
                if (aiUtils.getAvailableModels().includes(model)) {
                    newConfig.model = model;
                } else {
                    await sock.sendMessage(sender, {
                        text: `⚠️ Modelo inválido. Usando o modelo atual: ${currentConfig.model}`
                    });
                    newConfig.model = currentConfig.model;
                }
                
                updateState('config', {
                    step: 3,
                    config: newConfig
                });
                
                await sock.sendMessage(sender, {
                    text: `3️⃣ Qual nome você deseja dar ao bot? (Atual: ${currentConfig.botName})`
                });
                break;
                
            case 3: // Nome do bot
                const botName = messageContent.trim();
                if (botName) {
                    newConfig.botName = botName;
                } else {
                    newConfig.botName = currentConfig.botName;
                }
                
                updateState('config', {
                    step: 4,
                    config: newConfig
                });
                
                await sock.sendMessage(sender, {
                    text: `4️⃣ O bot deve responder apenas quando mencionado pelo nome? (sim/não)
                    
Atual: ${currentConfig.replyOnlyWhenMentioned ? 'Sim' : 'Não'}`
                });
                break;
                
            case 4: // Responder apenas quando mencionado
                const mentionResponse = messageContent.toLowerCase();
                if (mentionResponse === 'sim' || mentionResponse === 's' || mentionResponse === 'yes' || mentionResponse === 'y') {
                    newConfig.replyOnlyWhenMentioned = true;
                } else {
                    newConfig.replyOnlyWhenMentioned = false;
                }
                
                updateState('config', {
                    step: 5,
                    config: newConfig
                });
                
                await sock.sendMessage(sender, {
                    text: `5️⃣ Você deseja configurar uma chave de API do OpenAI? (sim/não)
                    
${aiConfig.getApiKey(sender) ? 'Você já tem uma chave configurada.' : 'Você ainda não configurou uma chave.'}`
                });
                break;
                
            case 5: // Configurar chave de API
                const apiKeyResponse = messageContent.toLowerCase();
                
                if (apiKeyResponse === 'sim' || apiKeyResponse === 's' || apiKeyResponse === 'yes' || apiKeyResponse === 'y') {
                    updateState('config', {
                        step: 6,
                        config: newConfig
                    });
                    
                    await sock.sendMessage(sender, {
                        text: `Por favor, forneça sua chave de API do OpenAI (começa com sk-).`
                    });
                } else {
                    // Pular para o final
                    // Aplicar configuração
                    aiConfig.updateChatConfig(sender, newConfig);
                    
                    // Limpar estado
                    clearState();
                    
                    await sock.sendMessage(sender, {
                        text: `✅ Configuração concluída com sucesso!

*Resumo da configuração:*
- Ativado: ${newConfig.enabled ? 'Sim' : 'Não'}
- Modelo: ${newConfig.model}
- Nome do Bot: ${newConfig.botName}
- Responder apenas quando mencionado: ${newConfig.replyOnlyWhenMentioned ? 'Sim' : 'Não'}
- Chave de API: ${aiConfig.getApiKey(sender) ? 'Configurada' : 'Não configurada'}`
                    });
                }
                break;
                
            case 6: // Receber chave de API
                const apiKey = messageContent.trim();
                
                if (apiKey.startsWith('sk-')) {
                    // Salvar chave de API
                    aiConfig.setApiKey(sender, apiKey);
                    
                    // Aplicar configuração
                    aiConfig.updateChatConfig(sender, newConfig);
                    
                    // Limpar estado
                    clearState();
                    
                    await sock.sendMessage(sender, {
                        text: `✅ Configuração concluída com sucesso!

*Resumo da configuração:*
- Ativado: ${newConfig.enabled ? 'Sim' : 'Não'}
- Modelo: ${newConfig.model}
- Nome do Bot: ${newConfig.botName}
- Responder apenas quando mencionado: ${newConfig.replyOnlyWhenMentioned ? 'Sim' : 'Não'}
- Chave de API: Configurada`
                    });
                } else {
                    await sock.sendMessage(sender, {
                        text: `⚠️ A chave de API parece inválida. Ela deve começar com "sk-".

Por favor, tente novamente ou digite "pular" para continuar sem configurar a chave.`
                    });
                }
                break;
                
            default:
                // Limpar estado
                clearState();
                
                await sock.sendMessage(sender, {
                    text: '⚠️ Erro na configuração. Por favor, tente novamente com !ai config'
                });
                break;
        }
    }
    
    /**
     * Mostra os modelos disponíveis
     */
    private async showModels(sock: WASocket, sender: string): Promise<void> {
        const models = aiUtils.getAvailableModels();
        
        const message = `🤖 *Modelos Disponíveis*

${models.join('\n')}

Use !ai model [nome_do_modelo] para alterar o modelo.`;
        
        await sock.sendMessage(sender, { text: message });
    }
    
    /**
     * Define o prompt do sistema
     */
    private async setSystemPrompt(sock: WASocket, sender: string, prompt: string): Promise<void> {
        if (!prompt) {
            const currentPrompt = aiConfig.getGlobalConfig().systemPrompt;
            
            await sock.sendMessage(sender, {
                text: `*Prompt do Sistema Atual:*\n\n${currentPrompt}\n\nPara alterar, use !ai prompt [novo_prompt]`
            });
            return;
        }
        
        aiConfig.setSystemPrompt(prompt);
        
        await sock.sendMessage(sender, {
            text: '✅ Prompt do sistema atualizado com sucesso!'
        });
    }
    
    /**
     * Testa o assistente de IA com uma mensagem específica
     */
    private async testAI(sock: WASocket, sender: string, message: string): Promise<void> {
        if (!message) {
            await sock.sendMessage(sender, {
                text: '⚠️ Por favor, forneça uma mensagem para testar o assistente de IA.\n\nExemplo: !ai test Olá, como você está?'
            });
            return;
        }
        
        // Verificar se o assistente está ativado
        const config = aiConfig.getChatConfig(sender);
        if (!config.enabled) {
            await sock.sendMessage(sender, {
                text: '⚠️ O assistente de IA está desativado. Ative-o primeiro com !ai on'
            });
            return;
        }
        
        // Verificar se há chave de API configurada
        const apiKey = aiConfig.getApiKey(sender);
        if (!apiKey) {
            await sock.sendMessage(sender, {
                text: '⚠️ Nenhuma chave de API configurada. Configure uma chave com !ai apikey [sua_chave]'
            });
            return;
        }
        
        await sock.sendMessage(sender, {
            text: '🔄 Gerando resposta...'
        });
        
        try {
            // Obter nome do usuário (se disponível)
            let userName: string | undefined;
            
            // Gerar resposta - usar modo de teste para ignorar verificação de menção
            logger.debug(`Testando IA com mensagem: "${message}"`);
            const response = await aiUtils.generateResponse(sender, `__TEST_MODE__ ${message}`, userName);
            
            if (!response) {
                await sock.sendMessage(sender, {
                    text: '❌ Não foi possível gerar uma resposta.'
                });
                return;
            }
            
            // Enviar resposta
            await sock.sendMessage(sender, {
                text: `🤖 *Resposta do Assistente*\n\n${response}`
            });
        } catch (error) {
            logger.error(`Erro ao testar IA: ${(error as Error).message}`, error as Error);
            await sock.sendMessage(sender, {
                text: `❌ Erro ao gerar resposta: ${(error as Error).message}`
            });
        }
    }
    
    /**
     * Processa uma mensagem recebida
     * @param message Mensagem recebida
     * @param sock Socket do WhatsApp
     * @returns Verdadeiro se a mensagem foi processada
     */
    public async processMessage(message: proto.IWebMessageInfo, sock: WASocket): Promise<boolean> {
        try {
            
            // Verificar se a mensagem é válida
            if (!message.key || !message.key.remoteJid || !message.message) {
                return false;
            }
            
            // Obter informações da mensagem
            const sender = message.key.remoteJid;
            
            // Extrair texto da mensagem
            let messageText = '';
            
            if (message.message.conversation) {
                messageText = message.message.conversation;
            } else if (message.message.extendedTextMessage?.text) {
                messageText = message.message.extendedTextMessage.text;
            } else {
                // Não é uma mensagem de texto
                return false;
            }
            
            // Verificar se a mensagem é do próprio bot
            // Não queremos que o bot responda às suas próprias mensagens
            if (message.key.fromMe === true && message.key.id?.startsWith('BAE5')) {
                logger.debug('Ignorando mensagem enviada pelo próprio bot');
                return false;
            }
            
            // Verificar se a mensagem é uma resposta do bot (mesmo que não tenha sido enviada pelo bot)
            // Isso é necessário para evitar loops quando o bot responde a mensagens
            const history = aiUtils.getHistory(sender);
            const lastBotMessage = history.messages.length > 0 && history.messages[history.messages.length - 1].role === 'assistant' 
                ? history.messages[history.messages.length - 1].content 
                : null;
                
            if (lastBotMessage && messageText.toLowerCase() === lastBotMessage.toLowerCase()) {
                logger.debug('Ignorando mensagem que é idêntica à última resposta do bot');
                return false;
            }
            
            // Ignorar comandos
            if (messageText.startsWith('!')) {
                return false;
            }
            
            // Verificar se o bot deve responder com base no contexto da conversa
            logger.debug(`Processando mensagem para IA: "${messageText}"`);
            
            // Obter configuração do chat
            const chatConfig = aiConfig.getChatConfig(sender);
            logger.debug(`Configuração do chat: Nome do Bot="${chatConfig.botName}", Responder apenas quando mencionado=${chatConfig.replyOnlyWhenMentioned}`);
            
            // Verificar menção diretamente
            const isMentioned = aiUtils.isBotMentioned(messageText, chatConfig.botName);
            logger.debug(`Bot mencionado: ${isMentioned ? 'Sim' : 'Não'}`);
            
            // Verificar se deve responder
            const shouldRespond = aiUtils.shouldRespond(sender, messageText);
            logger.debug(`Verificação de resposta para ${sender}: ${shouldRespond ? 'Sim' : 'Não'}`);
            
            if (!shouldRespond) {
                logger.debug(`Bot decidiu não responder à mensagem para o chat ${sender}`);
                return false;
            }
            
            logger.debug(`Bot vai responder à mensagem para o chat ${sender}`);
            
            // Obter nome do usuário
            let userName: string | undefined;
            if (message.pushName) {
                userName = message.pushName;
            }
            
            // Gerar resposta
            const response = await aiUtils.generateResponse(sender, messageText, userName);
            
            // Verificar se há resposta
            if (!response) {
                return false;
            }
            
            // Enviar resposta
            await sock.sendMessage(sender, { text: `🤖\n${response}` });
            
            return true;
        } catch (error) {
            logger.error(`Erro ao processar mensagem para IA: ${(error as Error).message}`, error as Error);
            return false;
        }
    }
    
    /**
     * Método chamado quando o bot é desligado
     */
    public async onShutdown(): Promise<void> {
        logger.info('Plugin de assistente de IA está sendo desligado');
        await super.onShutdown();
    }
}
