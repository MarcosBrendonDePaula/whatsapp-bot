import * as fs from 'fs';
import * as path from 'path';
import logger from '../../utils/logger';

/**
 * Interface para configuração do chat com IA
 */
export interface ChatAIConfig {
    // Se o assistente de IA está habilitado para este chat
    enabled: boolean;
    // Chave de API do OpenAI para este chat (opcional)
    apiKey?: string;
    // Modelo a ser usado (padrão: gpt-3.5-turbo)
    model: string;
    // Nome do bot para ser usado como gatilho
    botName: string;
    // Temperatura para geração de texto (0-2)
    temperature: number;
    // Número máximo de tokens na resposta
    maxTokens: number;
    // Se deve responder apenas quando mencionado pelo nome
    replyOnlyWhenMentioned: boolean;
    // Última vez que o bot foi usado neste chat
    lastUsed: string;
}

/**
 * Interface para configuração global do plugin de IA
 */
export interface AIPluginConfig {
    // Configuração padrão para novos chats
    defaultConfig: ChatAIConfig;
    // Configurações específicas por chat
    chatConfigs: Record<string, ChatAIConfig>;
    // Chave de API global do OpenAI (usada quando o chat não tem uma chave específica)
    globalApiKey?: string;
    // Diretório para armazenar o histórico de conversas
    historyDir: string;
    // Número máximo de mensagens para manter no histórico por chat
    maxHistoryMessages: number;
    // Prompt do sistema para o assistente
    systemPrompt: string;
}

// Caminho para o arquivo de configuração
const CONFIG_PATH = path.join(process.cwd(), '.data', 'ai-config.json');

// Configuração padrão
const DEFAULT_CONFIG: AIPluginConfig = {
    defaultConfig: {
        enabled: false,
        model: 'gpt-3.5-turbo',
        botName: 'Bot',
        temperature: 0.7,
        maxTokens: 500,
        replyOnlyWhenMentioned: true,
        lastUsed: new Date().toISOString()
    },
    chatConfigs: {},
    historyDir: path.join(process.cwd(), '.data', 'ai-history'),
    maxHistoryMessages: 10,
    systemPrompt: "Você é um assistente útil e amigável. Responda de forma concisa e clara.\n\nVocê tem acesso a ferramentas que permitem gerenciar conhecimento e obter informações contextuais. Use essas ferramentas quando necessário para fornecer respostas mais precisas e personalizadas.\n\nFERRAMENTAS DISPONÍVEIS:\n\n1. saveKnowledge - Salva um item de conhecimento na base de dados para uso futuro\n   Parâmetros:\n   - title: Título do conhecimento a ser salvo\n   - content: Conteúdo detalhado do conhecimento\n   - tags: Tags para categorizar o conhecimento (opcional)\n   - chatId: ID do chat onde o conhecimento será salvo\n\n2. searchKnowledge - Busca itens de conhecimento na base de dados\n   Parâmetros:\n   - query: Termo de busca (opcional)\n   - tags: Tags para filtrar os resultados (opcional)\n   - chatId: ID do chat onde o conhecimento está armazenado\n\n3. getKnowledgeItem - Obtém um item específico de conhecimento pelo ID\n   Parâmetros:\n   - id: ID do item de conhecimento\n   - chatId: ID do chat onde o conhecimento está armazenado\n\n4. getContext - Obtém informações contextuais sobre o chat atual\n   Parâmetros:\n   - chatId: ID do chat para obter o contexto\n\nEXEMPLOS DE USO:\n\n- Quando o usuário fornecer um horário de funcionamento, salve-o:\n  Exemplo: \"Vou salvar essa informação para referência futura.\"\n  Use a ferramenta saveKnowledge com:\n  - title: \"Horário de Funcionamento\"\n  - content: \"Segunda a sexta, das 9h às 18h\"\n  - tags: [\"horario\", \"funcionamento\"]\n  - chatId: [ID do chat atual]\n\n- Quando o usuário perguntar sobre informações salvas anteriormente:\n  Exemplo: \"Deixe-me verificar essa informação para você.\"\n  Use a ferramenta searchKnowledge com:\n  - query: \"horário\" (ou termo relevante)\n  - chatId: [ID do chat atual]\n\n- Para obter contexto sobre o chat atual:\n  Use a ferramenta getContext com:\n  - chatId: [ID do chat atual]\n\nVocê também pode salvar conhecimento usando o formato especial em sua resposta:\n[SAVE_KNOWLEDGE: Título da informação | Conteúdo detalhado | tag1, tag2, tag3]\n\nUse seu julgamento para decidir quais informações são importantes o suficiente para serem salvas. Priorize informações factuais, procedimentos, regras, contatos e outros dados que possam ser úteis em conversas futuras.\n\nO comando SAVE_KNOWLEDGE e o uso das ferramentas serão processados automaticamente e não aparecerão na sua resposta para o usuário."
};

/**
 * Classe para gerenciar a configuração do plugin de IA
 */
class AIConfigManager {
    private config: AIPluginConfig;
    
    constructor() {
        this.config = this.loadConfig();
        this.ensureHistoryDir();
    }
    
    /**
     * Carrega a configuração do arquivo
     */
    private loadConfig(): AIPluginConfig {
        try {
            // Verificar se o diretório existe
            const configDir = path.dirname(CONFIG_PATH);
            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true });
            }
            
            // Verificar se o arquivo existe
            if (!fs.existsSync(CONFIG_PATH)) {
                // Criar arquivo com configuração padrão
                fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2));
                logger.info(`Arquivo de configuração de IA criado em ${CONFIG_PATH}`);
                return DEFAULT_CONFIG;
            }
            
            // Ler arquivo
            const configData = fs.readFileSync(CONFIG_PATH, 'utf-8');
            const config = JSON.parse(configData) as AIPluginConfig;
            
            // Garantir que todos os campos necessários existam
            return {
                ...DEFAULT_CONFIG,
                ...config,
                defaultConfig: {
                    ...DEFAULT_CONFIG.defaultConfig,
                    ...config.defaultConfig
                }
            };
        } catch (error) {
            logger.error(`Erro ao carregar configuração de IA: ${(error as Error).message}`, error as Error);
            return DEFAULT_CONFIG;
        }
    }
    
    /**
     * Salva a configuração no arquivo
     */
    private saveConfig(): void {
        try {
            fs.writeFileSync(CONFIG_PATH, JSON.stringify(this.config, null, 2));
        } catch (error) {
            logger.error(`Erro ao salvar configuração de IA: ${(error as Error).message}`, error as Error);
        }
    }
    
    /**
     * Garante que o diretório de histórico existe
     */
    private ensureHistoryDir(): void {
        try {
            if (!fs.existsSync(this.config.historyDir)) {
                fs.mkdirSync(this.config.historyDir, { recursive: true });
                logger.info(`Diretório de histórico de IA criado em ${this.config.historyDir}`);
            }
        } catch (error) {
            logger.error(`Erro ao criar diretório de histórico de IA: ${(error as Error).message}`, error as Error);
        }
    }
    
    /**
     * Obtém a configuração para um chat específico
     * @param chatId ID do chat
     * @returns Configuração do chat
     */
    public getChatConfig(chatId: string): ChatAIConfig {
        logger.info(this.config)
        if (!this.config.chatConfigs[chatId]) {
            // Criar configuração para este chat
            this.config.chatConfigs[chatId] = {
                ...this.config.defaultConfig,
                lastUsed: new Date().toISOString()
            };
            this.saveConfig();
        }
        
        return this.config.chatConfigs[chatId];
    }
    
    /**
     * Atualiza a configuração para um chat específico
     * @param chatId ID do chat
     * @param config Nova configuração
     */
    public updateChatConfig(chatId: string, config: Partial<ChatAIConfig>): void {
        const currentConfig = this.getChatConfig(chatId);
        
        this.config.chatConfigs[chatId] = {
            ...currentConfig,
            ...config,
            lastUsed: new Date().toISOString()
        };
        
        this.saveConfig();
    }
    
    /**
     * Habilita o assistente de IA para um chat
     * @param chatId ID do chat
     */
    public enableAI(chatId: string): void {
        this.updateChatConfig(chatId, { enabled: true });
    }
    
    /**
     * Desabilita o assistente de IA para um chat
     * @param chatId ID do chat
     */
    public disableAI(chatId: string): void {
        this.updateChatConfig(chatId, { enabled: false });
    }
    
    /**
     * Define a chave de API para um chat específico
     * @param chatId ID do chat
     * @param apiKey Chave de API
     */
    public setApiKey(chatId: string, apiKey: string): void {
        this.updateChatConfig(chatId, { apiKey });
    }
    
    /**
     * Define o modelo para um chat específico
     * @param chatId ID do chat
     * @param model Nome do modelo
     */
    public setModel(chatId: string, model: string): void {
        this.updateChatConfig(chatId, { model });
    }
    
    /**
     * Define o nome do bot para um chat específico
     * @param chatId ID do chat
     * @param botName Nome do bot
     */
    public setBotName(chatId: string, botName: string): void {
        this.updateChatConfig(chatId, { botName });
    }
    
    /**
     * Define se o bot deve responder apenas quando mencionado
     * @param chatId ID do chat
     * @param replyOnlyWhenMentioned Valor booleano
     */
    public setReplyOnlyWhenMentioned(chatId: string, replyOnlyWhenMentioned: boolean): void {
        this.updateChatConfig(chatId, { replyOnlyWhenMentioned });
    }
    
    /**
     * Obtém a chave de API para um chat específico ou a chave global
     * @param chatId ID do chat
     * @returns Chave de API ou undefined se não encontrada
     */
    public getApiKey(chatId: string): string | undefined {
        const chatConfig = this.getChatConfig(chatId);
        return chatConfig.apiKey || this.config.globalApiKey;
    }
    
    /**
     * Define a chave de API global
     * @param apiKey Chave de API
     */
    public setGlobalApiKey(apiKey: string): void {
        this.config.globalApiKey = apiKey;
        this.saveConfig();
    }
    
    /**
     * Obtém a configuração global do plugin
     */
    public getGlobalConfig(): AIPluginConfig {
        return this.config;
    }
    
    /**
     * Atualiza a configuração global do plugin
     * @param config Nova configuração parcial
     */
    public updateGlobalConfig(config: Partial<AIPluginConfig>): void {
        this.config = {
            ...this.config,
            ...config
        };
        
        if (config.defaultConfig) {
            this.config.defaultConfig = {
                ...this.config.defaultConfig,
                ...config.defaultConfig
            };
        }
        
        this.saveConfig();
    }
    
    /**
     * Atualiza o prompt do sistema
     * @param systemPrompt Novo prompt do sistema
     */
    public setSystemPrompt(systemPrompt: string): void {
        this.config.systemPrompt = systemPrompt;
        this.saveConfig();
    }
}

export default new AIConfigManager();
