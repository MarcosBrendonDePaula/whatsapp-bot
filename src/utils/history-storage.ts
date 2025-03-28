import * as fs from 'fs';
import * as path from 'path';
import config from '../config';
import logger from './logger';

/**
 * Interface para os dados de histórico
 */
interface HistoryData {
    chats: any[];
    contacts: Record<string, any>;
    messages: any[];
    syncType?: any; // Aceita qualquer tipo para syncType, incluindo undefined
    timestamp: string;
}

/**
 * Classe para gerenciar o armazenamento de histórico
 */
class HistoryStorage {
    private storageDir: string | null = null;
    
    constructor() {
        // Verificar se o armazenamento de histórico está configurado
        if (config.historySync?.enabled && config.historySync?.storageDir) {
            this.storageDir = path.resolve(config.historySync.storageDir);
            this.ensureDirectoryExists();
        }
    }
    
    /**
     * Garante que o diretório de armazenamento existe
     */
    private ensureDirectoryExists(): void {
        if (!this.storageDir) return;
        
        try {
            if (!fs.existsSync(this.storageDir)) {
                fs.mkdirSync(this.storageDir, { recursive: true });
                logger.info(`Diretório de armazenamento de histórico criado: ${this.storageDir}`);
            }
        } catch (error) {
            logger.error(`Erro ao criar diretório de armazenamento de histórico: ${(error as Error).message}`, error as Error);
            this.storageDir = null;
        }
    }
    
    /**
     * Salva os dados de histórico
     * @param data Dados de histórico
     */
    public saveHistory(data: HistoryData): void {
        if (!this.storageDir) return;
        
        try {
            // Criar um nome de arquivo baseado no timestamp
            const timestamp = new Date().toISOString().replace(/:/g, '-');
            const filename = `history_${data.syncType}_${timestamp}.json`;
            const filePath = path.join(this.storageDir, filename);
            
            // Salvar os dados em um arquivo JSON
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            
            logger.info(`Histórico salvo em: ${filePath}`);
        } catch (error) {
            logger.error(`Erro ao salvar histórico: ${(error as Error).message}`, error as Error);
        }
    }
    
    /**
     * Busca uma mensagem pelo ID
     * @param key Chave da mensagem
     * @returns Mensagem encontrada ou undefined
     */
    public getMessage(key: any): any {
        if (!this.storageDir) return undefined;
        
        try {
            // Implementação básica para buscar mensagens
            // Em uma implementação real, você usaria um banco de dados
            logger.debug(`Buscando mensagem com ID: ${key.id}`);
            
            // Por enquanto, retornamos undefined
            return undefined;
        } catch (error) {
            logger.error(`Erro ao buscar mensagem: ${(error as Error).message}`, error as Error);
            return undefined;
        }
    }
}

export default new HistoryStorage();
