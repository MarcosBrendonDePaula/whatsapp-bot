import { proto, WASocket } from '@whiskeysockets/baileys';
import * as fs from 'fs';
import * as path from 'path';
import config from '../config';
import logger from '../utils/logger';
import { UserState } from '../types';

/**
 * Gerenciador de estados para usuários
 * Permite que plugins e comandos criem fluxos de conversação baseados em estados
 */
class StateManager {
    private states: Map<string, UserState> = new Map();
    private stateFilePath: string;
    private saveInterval: NodeJS.Timeout | null = null;
    
    constructor() {
        // Definir o caminho do arquivo de estados
        this.stateFilePath = path.join(
            path.dirname(config.sessionPath), 
            'states.json'
        );
        
        // Carregar estados do arquivo se existir
        this.loadStates();
        
        // Configurar salvamento automático de estados
        this.setupAutoSave();
    }
    
    /**
     * Configura o salvamento automático de estados
     */
    private setupAutoSave(): void {
        // Obter intervalo de salvamento da configuração ou usar valor padrão
        const saveIntervalMinutes = config.states?.saveInterval || 5;
        
        // Salvar estados no intervalo configurado
        this.saveInterval = setInterval(() => {
            this.saveStates();
        }, saveIntervalMinutes * 60 * 1000);
        
        logger.debug(`Salvamento automático de estados configurado para cada ${saveIntervalMinutes} minutos`);
    }
    
    /**
     * Carrega os estados do arquivo
     */
    private loadStates(): void {
        try {
            if (fs.existsSync(this.stateFilePath)) {
                const data = fs.readFileSync(this.stateFilePath, 'utf-8');
                const statesData = JSON.parse(data);
                
                // Converter o objeto em um Map
                for (const [userId, state] of Object.entries(statesData)) {
                    this.states.set(userId, state as UserState);
                }
                
                logger.info(`${this.states.size} estados de usuário carregados`);
            } else {
                logger.info('Nenhum arquivo de estados encontrado, iniciando com estados vazios');
            }
        } catch (error) {
            logger.error(`Erro ao carregar estados: ${(error as Error).message}`, error as Error);
            // Iniciar com estados vazios em caso de erro
            this.states = new Map();
        }
    }
    
    /**
     * Salva os estados no arquivo
     */
    public saveStates(): void {
        try {
            // Converter o Map em um objeto para salvar como JSON
            const statesObject: Record<string, UserState> = {};
            for (const [userId, state] of this.states.entries()) {
                statesObject[userId] = state;
            }
            
            // Garantir que o diretório existe
            const dir = path.dirname(this.stateFilePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            
            // Salvar no arquivo
            fs.writeFileSync(this.stateFilePath, JSON.stringify(statesObject, null, 2), 'utf-8');
            logger.debug(`${this.states.size} estados de usuário salvos`);
        } catch (error) {
            logger.error(`Erro ao salvar estados: ${(error as Error).message}`, error as Error);
        }
    }
    
    /**
     * Obtém o estado atual de um usuário
     * @param userId ID do usuário
     * @returns Estado do usuário ou null se não existir
     */
    public getState(userId: string): UserState | null {
        return this.states.get(userId) || null;
    }
    
    /**
     * Define o estado de um usuário
     * @param userId ID do usuário
     * @param state Novo estado
     */
    public setState(userId: string, state: UserState): void {
        this.states.set(userId, state);
        logger.debug(`Estado definido para usuário ${userId}: ${state.currentState}`);
    }
    
    /**
     * Atualiza o estado atual de um usuário
     * @param userId ID do usuário
     * @param currentState Novo estado atual
     * @param data Dados adicionais (opcional)
     * @returns true se o estado foi atualizado, false se o usuário não existir
     */
    public updateState(userId: string, currentState: string, data?: Record<string, any>): boolean {
        const state = this.states.get(userId);
        
        if (!state) {
            return false;
        }
        
        state.currentState = currentState;
        
        if (data) {
            state.data = { ...state.data, ...data };
        }
        
        this.states.set(userId, state);
        logger.debug(`Estado atualizado para usuário ${userId}: ${currentState}`);
        
        return true;
    }
    
    /**
     * Cria um novo estado para um usuário
     * @param userId ID do usuário
     * @param pluginName Nome do plugin que está gerenciando o estado
     * @param initialState Estado inicial
     * @param data Dados adicionais (opcional)
     */
    public createState(
        userId: string, 
        pluginName: string, 
        initialState: string, 
        data?: Record<string, any>
    ): void {
        const state: UserState = {
            pluginName,
            currentState: initialState,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            data: data || {}
        };
        
        this.states.set(userId, state);
        logger.debug(`Novo estado criado para usuário ${userId}: ${initialState} (plugin: ${pluginName})`);
    }
    
    /**
     * Remove o estado de um usuário
     * @param userId ID do usuário
     * @returns true se o estado foi removido, false se o usuário não existir
     */
    public clearState(userId: string): boolean {
        const hadState = this.states.has(userId);
        this.states.delete(userId);
        
        if (hadState) {
            logger.debug(`Estado removido para usuário ${userId}`);
        }
        
        return hadState;
    }
    
    /**
     * Verifica se um usuário está em um determinado estado
     * @param userId ID do usuário
     * @param stateName Nome do estado
     * @returns true se o usuário está no estado especificado
     */
    public isInState(userId: string, stateName: string): boolean {
        const state = this.states.get(userId);
        return state !== undefined && state.currentState === stateName;
    }
    
    /**
     * Verifica se um usuário tem um estado gerenciado por um plugin específico
     * @param userId ID do usuário
     * @param pluginName Nome do plugin
     * @returns true se o usuário tem um estado gerenciado pelo plugin
     */
    public isStateFromPlugin(userId: string, pluginName: string): boolean {
        const state = this.states.get(userId);
        return state !== undefined && state.pluginName === pluginName;
    }
    
    /**
     * Obtém todos os usuários que estão em um determinado estado
     * @param stateName Nome do estado
     * @returns Array de IDs de usuários
     */
    public getUsersInState(stateName: string): string[] {
        const users: string[] = [];
        
        for (const [userId, state] of this.states.entries()) {
            if (state.currentState === stateName) {
                users.push(userId);
            }
        }
        
        return users;
    }
    
    /**
     * Obtém todos os usuários com estados gerenciados por um plugin específico
     * @param pluginName Nome do plugin
     * @returns Array de IDs de usuários
     */
    public getUsersFromPlugin(pluginName: string): string[] {
        const users: string[] = [];
        
        for (const [userId, state] of this.states.entries()) {
            if (state.pluginName === pluginName) {
                users.push(userId);
            }
        }
        
        return users;
    }
    
    /**
     * Limpa estados antigos que não foram atualizados por um período
     * @param maxAgeHours Idade máxima em horas (opcional, usa a configuração se não fornecido)
     * @returns Número de estados removidos
     */
    public cleanupOldStates(maxAgeHours?: number): number {
        // Usar o valor fornecido, ou da configuração, ou o padrão
        const maxAge = maxAgeHours || config.states?.maxAgeHours || 24;
        const now = new Date();
        const maxAgeMs = maxAge * 60 * 60 * 1000;
        let removedCount = 0;
        
        for (const [userId, state] of this.states.entries()) {
            const updatedAt = new Date(state.updatedAt);
            const ageMs = now.getTime() - updatedAt.getTime();
            
            if (ageMs > maxAgeMs) {
                this.states.delete(userId);
                removedCount++;
            }
        }
        
        if (removedCount > 0) {
            logger.info(`${removedCount} estados antigos removidos`);
        }
        
        return removedCount;
    }
    
    /**
     * Método chamado quando o bot é desligado
     */
    public async onShutdown(): Promise<void> {
        // Limpar o intervalo de salvamento automático
        if (this.saveInterval) {
            clearInterval(this.saveInterval);
            this.saveInterval = null;
        }
        
        // Salvar estados antes de desligar
        this.saveStates();
        logger.info('Estados salvos durante o desligamento');
    }
}

// Exportar uma instância única do gerenciador de estados
export default new StateManager();
