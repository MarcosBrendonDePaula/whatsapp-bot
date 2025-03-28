import * as fs from 'fs';
import * as path from 'path';
import { openai, createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { aiKnowledgeTools } from './ai-tools';
import logger from '../../utils/logger';
import aiConfig from './config';
import knowledgeManager from './knowledge-base';

/**
 * Interface para mensagem no histórico
 */
export interface HistoryMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
    name?: string;
    timestamp: string;
}

/**
 * Interface para histórico de conversa
 */
export interface ConversationHistory {
    chatId: string;
    messages: HistoryMessage[];
    lastUpdated: string;
}

/**
 * Classe para gerenciar o histórico de conversas e interações com IA
 */
class AIUtils {
    private histories: Map<string, ConversationHistory> = new Map();
    
    constructor() {
        this.loadHistories();
    }
    
    /**
     * Carrega os históricos de conversa do disco
     */
    private loadHistories(): void {
        try {
            const config = aiConfig.getGlobalConfig();
            const historyDir = config.historyDir;
            
            if (!fs.existsSync(historyDir)) {
                fs.mkdirSync(historyDir, { recursive: true });
                return;
            }
            
            const files = fs.readdirSync(historyDir);
            
            for (const file of files) {
                if (!file.endsWith('.json')) continue;
                
                try {
                    const filePath = path.join(historyDir, file);
                    const data = fs.readFileSync(filePath, 'utf-8');
                    const history = JSON.parse(data) as ConversationHistory;
                    
                    this.histories.set(history.chatId, history);
                } catch (error) {
                    logger.error(`Erro ao carregar histórico de ${file}: ${(error as Error).message}`, error as Error);
                }
            }
            
            logger.info(`Carregados ${this.histories.size} históricos de conversa`);
        } catch (error) {
            logger.error(`Erro ao carregar históricos: ${(error as Error).message}`, error as Error);
        }
    }
    
    /**
     * Salva um histórico de conversa no disco
     * @param chatId ID do chat
     */
    private saveHistory(chatId: string): void {
        try {
            const history = this.histories.get(chatId);
            if (!history) return;
            
            const config = aiConfig.getGlobalConfig();
            const historyDir = config.historyDir;
            
            if (!fs.existsSync(historyDir)) {
                fs.mkdirSync(historyDir, { recursive: true });
            }
            
            const filePath = path.join(historyDir, `${chatId.replace(/[^a-zA-Z0-9]/g, '_')}.json`);
            fs.writeFileSync(filePath, JSON.stringify(history, null, 2));
        } catch (error) {
            logger.error(`Erro ao salvar histórico para ${chatId}: ${(error as Error).message}`, error as Error);
        }
    }
    
    /**
     * Obtém o histórico de conversa para um chat
     * @param chatId ID do chat
     * @returns Histórico de conversa
     */
    public getHistory(chatId: string): ConversationHistory {
        if (!this.histories.has(chatId)) {
            const newHistory: ConversationHistory = {
                chatId,
                messages: [],
                lastUpdated: new Date().toISOString()
            };
            
            this.histories.set(chatId, newHistory);
        }
        
        return this.histories.get(chatId)!;
    }
    
    /**
     * Adiciona uma mensagem ao histórico
     * @param chatId ID do chat
     * @param message Mensagem a ser adicionada
     */
    public addMessage(chatId: string, message: HistoryMessage): void {
        const history = this.getHistory(chatId);
        const config = aiConfig.getGlobalConfig();
        
        // Adicionar mensagem
        history.messages.push(message);
        
        // Limitar o número de mensagens
        if (history.messages.length > config.maxHistoryMessages) {
            // Manter a primeira mensagem (sistema) e remover as mais antigas
            const systemMessage = history.messages.find(m => m.role === 'system');
            history.messages = history.messages.slice(-(config.maxHistoryMessages - (systemMessage ? 1 : 0)));
            
            // Adicionar a mensagem do sistema de volta ao início, se existir
            if (systemMessage) {
                history.messages.unshift(systemMessage);
            }
        }
        
        // Atualizar timestamp
        history.lastUpdated = new Date().toISOString();
        
        // Salvar histórico
        this.saveHistory(chatId);
    }
    
    /**
     * Limpa o histórico de conversa para um chat
     * @param chatId ID do chat
     */
    public clearHistory(chatId: string): void {
        const systemPrompt = aiConfig.getGlobalConfig().systemPrompt;
        
        const newHistory: ConversationHistory = {
            chatId,
            messages: [
                {
                    role: 'system',
                    content: systemPrompt,
                    timestamp: new Date().toISOString()
                }
            ],
            lastUpdated: new Date().toISOString()
        };
        
        this.histories.set(chatId, newHistory);
        this.saveHistory(chatId);
    }
    
    /**
     * Verifica se o bot foi mencionado na mensagem
     * @param message Texto da mensagem
     * @param botName Nome do bot
     * @returns Verdadeiro se o bot foi mencionado
     */
    public isBotMentioned(message: string, botName: string): boolean {
        // Normalizar texto para comparação
        const normalizedMessage = message.toLowerCase();
        const normalizedBotName = botName.toLowerCase();
        
        logger.debug(`Verificando menção: Mensagem="${normalizedMessage}", Nome do Bot="${normalizedBotName}"`);
        
        // Verificar menções diretas com @ (formato @nome_do_bot)
        logger.debug(`Verificando menção com @: "@${normalizedBotName}" em "${normalizedMessage}"`);
        if (normalizedMessage.includes(`@${normalizedBotName}`)) {
            logger.debug(`Menção detectada: @${normalizedBotName}`);
            return true;
        }
        
        // Verificar menções diretas com @ sem espaço (formato @nome_do_bot)
        if (normalizedMessage.startsWith(`@${normalizedBotName}`)) {
            logger.debug(`Menção detectada no início: @${normalizedBotName}`);
            return true;
        }
        
        // Verificar menções com @ seguido de espaço
        if (normalizedMessage.includes(` @${normalizedBotName}`)) {
            logger.debug(`Menção detectada com espaço antes: @${normalizedBotName}`);
            return true;
        }
        
        // Verificar menções diretas pelo nome (como palavra completa, não parte de outra palavra)
        const botNameRegex = new RegExp(`\\b${normalizedBotName}\\b`, 'i');
        if (botNameRegex.test(normalizedMessage)) {
            logger.debug(`Menção detectada como palavra completa: ${normalizedBotName}`);
            return true;
        }
        
        // Verificar padrões comuns de menção
        const mentionPatterns = [
            /^oi\s+bot/i,
            /^olá\s+bot/i,
            /^hey\s+bot/i,
            /bot[,.]?\s+/i,
            /^bot[,.]?$/i,
            /^assistente/i,
            /^ajuda/i,
            /@bot/i,
            /@assistente/i
        ];
        
        // Adicionar padrão específico para o nome do bot
        if (normalizedBotName !== 'bot' && normalizedBotName !== 'assistente') {
            mentionPatterns.push(new RegExp(`^oi\\s+${normalizedBotName}`, 'i'));
            mentionPatterns.push(new RegExp(`^olá\\s+${normalizedBotName}`, 'i'));
            mentionPatterns.push(new RegExp(`^hey\\s+${normalizedBotName}`, 'i'));
            mentionPatterns.push(new RegExp(`${normalizedBotName}[,.]?\\s+`, 'i'));
            mentionPatterns.push(new RegExp(`^${normalizedBotName}[,.]?$`, 'i'));
            mentionPatterns.push(new RegExp(`@${normalizedBotName}`, 'i'));
        }
        
        for (const pattern of mentionPatterns) {
            if (pattern.test(normalizedMessage)) {
                logger.debug(`Menção detectada por padrão: ${pattern}`);
                return true;
            }
        }
        
        logger.debug('Nenhuma menção detectada');
        return false;
    }
    
    /**
     * Analisa o contexto da conversa e decide se o bot deve responder
     * @param chatId ID do chat
     * @param message Mensagem atual
     * @returns Verdadeiro se o bot deve responder
     */
    public shouldRespond(chatId: string, message: string): boolean {
        // Obter configuração do chat
        const chatConfig = aiConfig.getChatConfig(chatId);
        
        // Se o assistente estiver desabilitado, não responder
        if (!chatConfig.enabled) {
            return false;
        }
        
        // Se o modo de menção estiver ativado, verificar se o bot foi mencionado
        if (chatConfig.replyOnlyWhenMentioned) {
            return this.isBotMentioned(message, chatConfig.botName);
        }
        
        // Analisar o conteúdo da mensagem para decidir se deve responder
        
        // Verificar se a mensagem parece uma pergunta
        if (message.includes('?')) {
            return true;
        }
        
        // Verificar se a mensagem parece um pedido de ajuda
        const helpPatterns = [
            /ajud[ae]/i,
            /socorro/i,
            /preciso de/i,
            /como fa[çz]o/i,
            /pode[s]? me/i,
            /sabe[s]? como/i
        ];
        
        if (helpPatterns.some(pattern => pattern.test(message))) {
            return true;
        }
        
        // Verificar o histórico de conversa para contexto
        const history = this.getHistory(chatId);
        
        // Se o bot respondeu à última mensagem, há maior chance de continuar a conversa
        const lastMessages = history.messages.slice(-2);
        if (lastMessages.length >= 2 && 
            lastMessages[lastMessages.length - 2].role === 'assistant') {
            // Maior probabilidade de responder se for continuação de conversa
            return true;
        }
        
        // Por padrão, se o modo de menção estiver desativado, responder a todas as mensagens
        return !chatConfig.replyOnlyWhenMentioned;
    }
    
    /**
     * Cria uma instância do OpenAI com a chave de API fornecida
     * @param apiKey Chave de API do OpenAI
     * @returns Instância do OpenAI
     */
    private createOpenAIInstance(apiKey: string): ReturnType<typeof createOpenAI> {
        return createOpenAI({
            apiKey,
            compatibility: 'strict'
        });
    }
    
    /**
     * Gera uma resposta usando a API do OpenAI
     * @param chatId ID do chat
     * @param userMessage Mensagem do usuário
     * @param userName Nome do usuário (opcional)
     * @returns Resposta gerada
     */
    public async generateResponse(chatId: string, userMessage: string, userName?: string): Promise<string> {
        try {
            // Obter configuração do chat
            const chatConfig = aiConfig.getChatConfig(chatId);
            
            // Verificar se o assistente está habilitado
            if (!chatConfig.enabled) {
                logger.debug(`Assistente de IA desabilitado para o chat ${chatId}`);
                return '';
            }
            
            // Verificar se deve responder apenas quando mencionado
            // No modo de teste, ignoramos a verificação de menção
            const isTestMode = userMessage.startsWith('__TEST_MODE__');
            const testMessage = isTestMode ? userMessage.replace('__TEST_MODE__', '').trim() : userMessage;
            
            if (!isTestMode && chatConfig.replyOnlyWhenMentioned && !this.isBotMentioned(userMessage, chatConfig.botName)) {
                logger.debug(`Bot não mencionado na mensagem para o chat ${chatId}`);
                return '';
            }
            
            // Se estiver em modo de teste, usar a mensagem sem o prefixo
            const finalMessage = isTestMode ? testMessage : userMessage;
            
            // Obter chave de API
            const apiKey = aiConfig.getApiKey(chatId);
            if (!apiKey) {
                logger.warn(`Nenhuma chave de API configurada para o chat ${chatId}`);
                return 'Desculpe, não foi configurada uma chave de API para este chat. Por favor, configure uma chave usando o comando !ai apikey [sua_chave].';
            }
            
            // Obter histórico de conversa
            const history = this.getHistory(chatId);
            
            // Adicionar mensagem do sistema se não existir ou atualizar com conhecimento personalizado
            const systemPrompt = aiConfig.getGlobalConfig().systemPrompt;
            const knowledgePrompt = knowledgeManager.formatKnowledgeForPrompt(chatId);
            const fullSystemPrompt = knowledgePrompt 
                ? `${systemPrompt}\n\n${knowledgePrompt}`
                : systemPrompt;
                
            // Verificar se já existe uma mensagem do sistema
            const systemMessageIndex = history.messages.findIndex(m => m.role === 'system');
            if (systemMessageIndex === -1) {
                // Adicionar nova mensagem do sistema
                this.addMessage(chatId, {
                    role: 'system',
                    content: fullSystemPrompt,
                    timestamp: new Date().toISOString()
                });
            } else {
                // Atualizar mensagem do sistema existente
                history.messages[systemMessageIndex].content = fullSystemPrompt;
                history.lastUpdated = new Date().toISOString();
                this.saveHistory(chatId);
            }
            
            // Adicionar mensagem do usuário ao histórico
            this.addMessage(chatId, {
                role: 'user',
                content: userMessage,
                name: userName,
                timestamp: new Date().toISOString()
            });
            
            // Criar instância do OpenAI
            const openaiInstance = this.createOpenAIInstance(apiKey);
            
            // Preparar mensagens para a API
            const messages = history.messages.map(m => ({
                role: m.role,
                content: m.content,
                name: m.name
            }));
            
            // Gerar resposta
            logger.debug(`Gerando resposta para ${chatId} usando modelo ${chatConfig.model}`);
            logger.debug(`Histórico de mensagens: ${messages.length} mensagens`);
            
            try {
                // Verificar se o modelo suporta ferramentas (apenas GPT-4 e superiores)
                const supportsTools = chatConfig.model.startsWith('gpt-4');
                
                // Configuração base
                const config: any = {
                    model: openaiInstance(chatConfig.model),
                    messages,
                    temperature: chatConfig.temperature,
                    maxTokens: chatConfig.maxTokens
                };
                
                // Adicionar ferramentas apenas para modelos compatíveis
                if (supportsTools) {
                    try {
                        config.tools = aiKnowledgeTools();
                    } catch (toolError) {
                        logger.error(`Erro ao configurar ferramentas: ${(toolError as Error).message}`, toolError as Error);
                        // Continuar sem ferramentas
                    }
                }
                
                const result = await generateText(config);
                
                logger.debug(`Resposta gerada com sucesso: ${result.text.substring(0, 50)}...`);
                
                // Verificar se a resposta contém comandos para salvar conhecimento
                const processedResponse = this.processKnowledgeCommands(chatId, result.text);
                
                // Adicionar resposta ao histórico
                this.addMessage(chatId, {
                    role: 'assistant',
                    content: processedResponse.cleanResponse,
                    timestamp: new Date().toISOString()
                });
                
                // Atualizar última utilização
                aiConfig.updateChatConfig(chatId, { lastUsed: new Date().toISOString() });
                
                return processedResponse.cleanResponse;
            } catch (apiError) {
                logger.error(`Erro na API do OpenAI: ${(apiError as Error).message}`, apiError as Error);
                return `Desculpe, ocorreu um erro ao gerar a resposta: ${(apiError as Error).message}`;
            }
        } catch (error) {
            logger.error(`Erro ao gerar resposta para ${chatId}: ${(error as Error).message}`, error as Error);
            return `Desculpe, ocorreu um erro ao processar sua solicitação: ${(error as Error).message}`;
        }
    }
    
    /**
     * Processa comandos de conhecimento na resposta da IA
     * @param chatId ID do chat
     * @param response Resposta da IA
     * @returns Resposta limpa e informações sobre comandos processados
     */
    private processKnowledgeCommands(chatId: string, response: string): { cleanResponse: string, commandsProcessed: boolean } {
        // Padrão para detectar comandos de conhecimento
        // Formato: [SAVE_KNOWLEDGE: título | conteúdo | tag1, tag2, ...]
        const knowledgeCommandRegex = /\[SAVE_KNOWLEDGE:\s*([^|]+)\s*\|\s*([^|]+)(?:\s*\|\s*([^[\]]+))?\]/g;
        
        let cleanResponse = response;
        let commandsProcessed = false;
        let match;
        
        // Encontrar todos os comandos de conhecimento
        while ((match = knowledgeCommandRegex.exec(response)) !== null) {
            commandsProcessed = true;
            
            const fullMatch = match[0];
            const title = match[1].trim();
            const content = match[2].trim();
            const tagsString = match[3] ? match[3].trim() : '';
            
            // Processar tags
            const tags = tagsString
                .split(',')
                .map(tag => tag.trim())
                .filter(tag => tag.length > 0);
            
            // Salvar conhecimento
            try {
                const id = knowledgeManager.addKnowledgeItem(chatId, title, content, tags);
                logger.info(`IA salvou conhecimento automaticamente: ${title} (ID: ${id})`);
            } catch (error) {
                logger.error(`Erro ao salvar conhecimento automaticamente: ${(error as Error).message}`, error as Error);
            }
            
            // Remover o comando da resposta
            cleanResponse = cleanResponse.replace(fullMatch, '');
        }
        
        // Limpar espaços extras e linhas em branco resultantes da remoção dos comandos
        cleanResponse = cleanResponse
            .replace(/\n{3,}/g, '\n\n')  // Substituir 3+ quebras de linha por 2
            .trim();
        
        return { cleanResponse, commandsProcessed };
    }
    
    /**
     * Lista os modelos disponíveis
     * @returns Lista de modelos
     */
    public getAvailableModels(): string[] {
        return [
            'gpt-3.5-turbo',
            'gpt-3.5-turbo-16k',
            'gpt-4',
            'gpt-4-turbo',
            'gpt-4o',
            'gpt-4o-mini'
        ];
    }
}

export default new AIUtils();
