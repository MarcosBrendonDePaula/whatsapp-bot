import { proto, WASocket } from '@whiskeysockets/baileys';

/**
 * Interface para o estado de um usuário
 */
export interface UserState {
    /**
     * Nome do plugin que está gerenciando o estado
     */
    pluginName: string;
    
    /**
     * Estado atual do usuário
     */
    currentState: string;
    
    /**
     * Data de criação do estado
     */
    createdAt: string;
    
    /**
     * Data da última atualização do estado
     */
    updatedAt: string;
    
    /**
     * Dados adicionais associados ao estado
     */
    data: Record<string, any>;
}

/**
 * Parâmetros estendidos para comandos com suporte a estados
 */
export interface StateCommandParams extends CommandParams {
    /**
     * Estado atual do usuário, se existir
     */
    state: UserState | null;
    
    /**
     * Função para criar um novo estado
     */
    createState: (initialState: string, data?: Record<string, any>) => void;
    
    /**
     * Função para atualizar o estado atual
     */
    updateState: (newState: string, data?: Record<string, any>) => boolean;
    
    /**
     * Função para limpar o estado
     */
    clearState: () => boolean;
}

export interface CommandParams {
    sock: WASocket;
    msg: proto.IWebMessageInfo;
    sender: string;
    args: string[];
    isGroup: boolean;
    messageContent: string;
}

export interface Command {
    (params: CommandParams | StateCommandParams): Promise<void>;
}

export interface Commands {
    [key: string]: Command;
}

export interface LoggingConfig {
    dir: string;
    level: string;
    rotation: {
        maxSize: string;
        maxFiles: number;
        datePattern: string;
    };
    console: boolean;
}

export interface PluginsConfig {
    dir: string;
    enabled: string[];
    disabled: string[];
}

export interface StateConfig {
    /**
     * Tempo máximo (em horas) para manter estados inativos
     */
    maxAgeHours: number;
    
    /**
     * Intervalo (em minutos) para salvar estados automaticamente
     */
    saveInterval: number;
}

/**
 * Configurações de sincronização de histórico
 */
export interface HistorySyncConfig {
    /**
     * Se deve sincronizar o histórico de mensagens
     */
    enabled: boolean;
    
    /**
     * Diretório para armazenar o histórico (opcional)
     */
    storageDir?: string;
}

export interface Config {
    sessionPath: string;
    prefix: string;
    ownerNumber: string;
    botName: string;
    logging: LoggingConfig;
    plugins: PluginsConfig;
    
    /**
     * Configurações do sistema de estados
     */
    states?: StateConfig;
    
    /**
     * Configurações de sincronização de histórico
     */
    historySync?: HistorySyncConfig;
}
