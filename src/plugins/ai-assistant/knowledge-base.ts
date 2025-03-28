import * as fs from 'fs';
import * as path from 'path';
import logger from '../../utils/logger';

/**
 * Interface para um item de conhecimento
 */
export interface KnowledgeItem {
    id: string;
    title: string;
    content: string;
    tags: string[];
    createdAt: string;
    updatedAt: string;
}

/**
 * Interface para a base de conhecimento
 */
export interface KnowledgeBase {
    items: KnowledgeItem[];
    lastUpdated: string;
}

/**
 * Classe para gerenciar a base de conhecimento da IA
 */
class KnowledgeManager {
    private knowledgeBase: Map<string, KnowledgeBase> = new Map();
    private knowledgeDir: string;
    
    constructor(baseDir: string = '.data/ai-knowledge') {
        this.knowledgeDir = baseDir;
        this.loadKnowledgeBase();
    }
    
    /**
     * Carrega a base de conhecimento do disco
     */
    private loadKnowledgeBase(): void {
        try {
            if (!fs.existsSync(this.knowledgeDir)) {
                fs.mkdirSync(this.knowledgeDir, { recursive: true });
                return;
            }
            
            const files = fs.readdirSync(this.knowledgeDir);
            
            for (const file of files) {
                if (!file.endsWith('.json')) continue;
                
                try {
                    const filePath = path.join(this.knowledgeDir, file);
                    const data = fs.readFileSync(filePath, 'utf-8');
                    const kb = JSON.parse(data) as KnowledgeBase;
                    const chatId = file.replace('.json', '');
                    
                    this.knowledgeBase.set(chatId, kb);
                } catch (error) {
                    logger.error(`Erro ao carregar base de conhecimento de ${file}: ${(error as Error).message}`, error as Error);
                }
            }
            
            logger.info(`Carregadas ${this.knowledgeBase.size} bases de conhecimento`);
        } catch (error) {
            logger.error(`Erro ao carregar bases de conhecimento: ${(error as Error).message}`, error as Error);
        }
    }
    
    /**
     * Salva a base de conhecimento no disco
     * @param chatId ID do chat
     */
    private saveKnowledgeBase(chatId: string): void {
        try {
            const kb = this.knowledgeBase.get(chatId);
            if (!kb) return;
            
            if (!fs.existsSync(this.knowledgeDir)) {
                fs.mkdirSync(this.knowledgeDir, { recursive: true });
            }
            
            const filePath = path.join(this.knowledgeDir, `${chatId.replace(/[^a-zA-Z0-9]/g, '_')}.json`);
            fs.writeFileSync(filePath, JSON.stringify(kb, null, 2));
        } catch (error) {
            logger.error(`Erro ao salvar base de conhecimento para ${chatId}: ${(error as Error).message}`, error as Error);
        }
    }
    
    /**
     * Obtém a base de conhecimento para um chat
     * @param chatId ID do chat
     * @returns Base de conhecimento
     */
    public getKnowledgeBase(chatId: string): KnowledgeBase {
        if (!this.knowledgeBase.has(chatId)) {
            const newKB: KnowledgeBase = {
                items: [],
                lastUpdated: new Date().toISOString()
            };
            
            this.knowledgeBase.set(chatId, newKB);
        }
        
        return this.knowledgeBase.get(chatId)!;
    }
    
    /**
     * Adiciona um item de conhecimento
     * @param chatId ID do chat
     * @param title Título do item
     * @param content Conteúdo do item
     * @param tags Tags para categorizar o item
     * @returns ID do item adicionado
     */
    public addKnowledgeItem(chatId: string, title: string, content: string, tags: string[] = []): string {
        const kb = this.getKnowledgeBase(chatId);
        const now = new Date().toISOString();
        
        // Gerar ID único
        const id = `kb_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        
        // Criar item
        const item: KnowledgeItem = {
            id,
            title,
            content,
            tags,
            createdAt: now,
            updatedAt: now
        };
        
        // Adicionar à base
        kb.items.push(item);
        kb.lastUpdated = now;
        
        // Salvar
        this.saveKnowledgeBase(chatId);
        
        return id;
    }
    
    /**
     * Atualiza um item de conhecimento
     * @param chatId ID do chat
     * @param id ID do item
     * @param updates Atualizações para o item
     * @returns Verdadeiro se o item foi atualizado
     */
    public updateKnowledgeItem(
        chatId: string, 
        id: string, 
        updates: Partial<Pick<KnowledgeItem, 'title' | 'content' | 'tags'>>
    ): boolean {
        const kb = this.getKnowledgeBase(chatId);
        const itemIndex = kb.items.findIndex(item => item.id === id);
        
        if (itemIndex === -1) {
            return false;
        }
        
        // Atualizar item
        const item = kb.items[itemIndex];
        
        if (updates.title !== undefined) {
            item.title = updates.title;
        }
        
        if (updates.content !== undefined) {
            item.content = updates.content;
        }
        
        if (updates.tags !== undefined) {
            item.tags = updates.tags;
        }
        
        item.updatedAt = new Date().toISOString();
        kb.lastUpdated = item.updatedAt;
        
        // Salvar
        this.saveKnowledgeBase(chatId);
        
        return true;
    }
    
    /**
     * Remove um item de conhecimento
     * @param chatId ID do chat
     * @param id ID do item
     * @returns Verdadeiro se o item foi removido
     */
    public removeKnowledgeItem(chatId: string, id: string): boolean {
        const kb = this.getKnowledgeBase(chatId);
        const itemIndex = kb.items.findIndex(item => item.id === id);
        
        if (itemIndex === -1) {
            return false;
        }
        
        // Remover item
        kb.items.splice(itemIndex, 1);
        kb.lastUpdated = new Date().toISOString();
        
        // Salvar
        this.saveKnowledgeBase(chatId);
        
        return true;
    }
    
    /**
     * Busca itens de conhecimento
     * @param chatId ID do chat
     * @param query Termo de busca
     * @param tags Tags para filtrar
     * @returns Itens encontrados
     */
    public searchKnowledge(chatId: string, query: string = '', tags: string[] = []): KnowledgeItem[] {
        const kb = this.getKnowledgeBase(chatId);
        
        // Se não há query nem tags, retornar todos os itens
        if (!query && tags.length === 0) {
            return [...kb.items];
        }
        
        // Normalizar query
        const normalizedQuery = query.toLowerCase();
        
        // Filtrar itens
        return kb.items.filter(item => {
            // Verificar query
            if (normalizedQuery) {
                const titleMatch = item.title.toLowerCase().includes(normalizedQuery);
                const contentMatch = item.content.toLowerCase().includes(normalizedQuery);
                
                if (!titleMatch && !contentMatch) {
                    return false;
                }
            }
            
            // Verificar tags
            if (tags.length > 0) {
                const hasAllTags = tags.every(tag => 
                    item.tags.some(itemTag => itemTag.toLowerCase() === tag.toLowerCase())
                );
                
                if (!hasAllTags) {
                    return false;
                }
            }
            
            return true;
        });
    }
    
    /**
     * Obtém um item de conhecimento pelo ID
     * @param chatId ID do chat
     * @param id ID do item
     * @returns Item de conhecimento ou undefined se não encontrado
     */
    public getKnowledgeItem(chatId: string, id: string): KnowledgeItem | undefined {
        const kb = this.getKnowledgeBase(chatId);
        return kb.items.find(item => item.id === id);
    }
    
    /**
     * Limpa a base de conhecimento
     * @param chatId ID do chat
     */
    public clearKnowledge(chatId: string): void {
        const kb: KnowledgeBase = {
            items: [],
            lastUpdated: new Date().toISOString()
        };
        
        this.knowledgeBase.set(chatId, kb);
        this.saveKnowledgeBase(chatId);
    }
    
    /**
     * Formata a base de conhecimento para uso no prompt do sistema
     * @param chatId ID do chat
     * @returns Texto formatado com o conhecimento
     */
    public formatKnowledgeForPrompt(chatId: string): string {
        const kb = this.getKnowledgeBase(chatId);
        
        if (kb.items.length === 0) {
            return '';
        }
        
        let result = '### CONHECIMENTO PERSONALIZADO ###\n\n';
        
        for (const item of kb.items) {
            result += `TÍTULO: ${item.title}\n`;
            result += `CONTEÚDO: ${item.content}\n`;
            
            if (item.tags.length > 0) {
                result += `TAGS: ${item.tags.join(', ')}\n`;
            }
            
            result += '\n---\n\n';
        }
        
        return result;
    }
}

export default new KnowledgeManager();
