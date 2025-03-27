import logger from './logger';

/**
 * Interface para as opções de configuração do TextRandomizer
 */
export interface TextRandomizerOptions {
    /**
     * Se deve lançar erro quando um tipo de mensagem não existir
     * @default false
     */
    throwOnMissingType?: boolean;
    
    /**
     * Mensagem padrão a ser retornada quando um tipo não for encontrado
     * @default "Mensagem não disponível"
     */
    defaultMessage?: string;
    
    /**
     * Se deve registrar operações no logger
     * @default true
     */
    enableLogging?: boolean;
}

/**
 * Classe para gerenciar e randomizar diferentes formatos de mensagens de texto
 */
export class TextRandomizer {
    /** Mapa contendo todos os templates de mensagens por tipo */
    private templates: Map<string, string[]>;
    
    /** Configurações do randomizador */
    private options: Required<TextRandomizerOptions>;
    
    /**
     * Cria uma nova instância do TextRandomizer
     * @param options Opções de configuração
     */
    constructor(options?: TextRandomizerOptions) {
        this.templates = new Map<string, string[]>();
        
        // Definir opções padrão
        this.options = {
            throwOnMissingType: false,
            defaultMessage: "Mensagem não disponível",
            enableLogging: true,
            ...options
        };
        
        if (this.options.enableLogging) {
            logger.info('TextRandomizer inicializado');
        }
    }
    
    /**
     * Adiciona templates para um tipo de mensagem
     * @param messageType O tipo/categoria da mensagem
     * @param templates Array com variações da mensagem
     * @returns A própria instância para encadeamento
     */
    public add(messageType: string, templates: string[]): TextRandomizer {
        if (!templates || templates.length === 0) {
            if (this.options.enableLogging) {
                logger.warn(`TextRandomizer: Tentativa de adicionar templates vazios para o tipo "${messageType}"`);
            }
            return this;
        }
        
        this.templates.set(messageType, templates);
        
        if (this.options.enableLogging) {
            logger.info(`TextRandomizer: Adicionados ${templates.length} templates para o tipo "${messageType}"`);
        }
        
        return this;
    }
    
    /**
     * Adiciona um único template para um tipo de mensagem
     * @param messageType O tipo/categoria da mensagem
     * @param template String com o template da mensagem
     * @returns A própria instância para encadeamento
     */
    public addSingle(messageType: string, template: string): TextRandomizer {
        if (!template || template.trim() === '') {
            if (this.options.enableLogging) {
                logger.warn(`TextRandomizer: Tentativa de adicionar template vazio para o tipo "${messageType}"`);
            }
            return this;
        }
        
        // Se já existir o tipo, adiciona ao array existente
        if (this.templates.has(messageType)) {
            const existingTemplates = this.templates.get(messageType) || [];
            existingTemplates.push(template);
            this.templates.set(messageType, existingTemplates);
        } else {
            // Caso contrário, cria um novo array
            this.templates.set(messageType, [template]);
        }
        
        if (this.options.enableLogging) {
            logger.info(`TextRandomizer: Adicionado novo template para o tipo "${messageType}"`);
        }
        
        return this;
    }
    
    /**
     * Obtém uma mensagem aleatória para o tipo especificado
     * @param messageType O tipo/categoria da mensagem
     * @param placeholders Objeto com valores para substituir nos placeholders
     * @returns Mensagem aleatória com os placeholders substituídos
     */
    public get(messageType: string, placeholders: Record<string, string | number> = {}): string {
        const templates = this.templates.get(messageType);
        
        if (!templates || templates.length === 0) {
            if (this.options.enableLogging) {
                logger.warn(`TextRandomizer: Nenhum template encontrado para o tipo "${messageType}"`);
            }
            
            if (this.options.throwOnMissingType) {
                throw new Error(`Nenhum template encontrado para o tipo "${messageType}"`);
            }
            
            return this.options.defaultMessage;
        }
        
        // Seleciona um template aleatório
        const randomIndex = Math.floor(Math.random() * templates.length);
        let response = templates[randomIndex];
        
        // Substitui placeholders se existirem
        Object.entries(placeholders).forEach(([key, value]) => {
            response = response.replace(new RegExp(`{${key}}`, 'g'), String(value));
        });
        
        return response;
    }
    
    /**
     * Verifica se existem templates para um determinado tipo de mensagem
     * @param messageType O tipo/categoria da mensagem
     * @returns true se existirem templates, false caso contrário
     */
    public has(messageType: string): boolean {
        const templates = this.templates.get(messageType);
        return !!templates && templates.length > 0;
    }
    
    /**
     * Remove templates para um determinado tipo de mensagem
     * @param messageType O tipo/categoria da mensagem
     * @returns A própria instância para encadeamento
     */
    public remove(messageType: string): TextRandomizer {
        if (this.templates.has(messageType)) {
            this.templates.delete(messageType);
            
            if (this.options.enableLogging) {
                logger.info(`TextRandomizer: Templates removidos para o tipo "${messageType}"`);
            }
        }
        
        return this;
    }
    
    /**
     * Obtém todos os tipos de mensagens registrados
     * @returns Array com os tipos de mensagens
     */
    public getTypes(): string[] {
        return Array.from(this.templates.keys());
    }
    
    /**
     * Obtém todos os templates para um determinado tipo de mensagem
     * @param messageType O tipo/categoria da mensagem
     * @returns Array com os templates ou undefined se o tipo não existir
     */
    public getTemplates(messageType: string): string[] | undefined {
        return this.templates.get(messageType);
    }
    
    /**
     * Limpa todos os templates registrados
     * @returns A própria instância para encadeamento
     */
    public clear(): TextRandomizer {
        this.templates.clear();
        
        if (this.options.enableLogging) {
            logger.info('TextRandomizer: Todos os templates foram removidos');
        }
        
        return this;
    }
    
    /**
     * Carrega um conjunto de templates a partir de um objeto
     * @param templates Objeto com os tipos e seus respectivos templates
     * @returns A própria instância para encadeamento
     */
    public loadFromObject(templates: Record<string, string[]>): TextRandomizer {
        Object.entries(templates).forEach(([type, templateList]) => {
            this.add(type, templateList);
        });
        
        return this;
    }
}

// Exporta uma instância padrão para uso rápido
export const textRandomizer = new TextRandomizer();

// Define categorias de mensagens comuns para facilitar o uso
export enum MessageType {
    WELCOME = 'welcome',
    GOODBYE = 'goodbye',
    THANKS = 'thanks',
    ERROR = 'error',
    SUCCESS = 'success',
    WARNING = 'warning',
    INFO = 'info',
    LOADING = 'loading',
    DOWNLOAD_START = 'download_start',
    DOWNLOAD_PROGRESS = 'download_progress',
    DOWNLOAD_COMPLETE = 'download_complete',
    FILE_TOO_LARGE = 'file_too_large',
    VIDEO_TOO_LONG = 'video_too_long',
    INVALID_FORMAT = 'invalid_format',
    NOT_FOUND = 'not_found',
    HELP = 'help'
}

export default textRandomizer;