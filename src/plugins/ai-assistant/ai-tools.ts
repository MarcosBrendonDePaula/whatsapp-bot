import logger from '../../utils/logger';
import knowledgeManager from './knowledge-base';
import messageQueue from '../../utils/message-queue';
import pluginManager from '../plugin-manager';

/**
 * Interface para definição de uma ferramenta
 */
export interface ToolDefinition {
    description: string;
    parameters: {
        type: string;
        properties: Record<string, any>;
        required?: string[];
    };
    execute: (params: any) => Promise<any>;
}

/**
 * Interface para parâmetros da ferramenta de salvar conhecimento
 */
interface SaveKnowledgeParams {
    title: string;
    content: string;
    tags?: string[];
    chatId: string;
}

/**
 * Interface para parâmetros da ferramenta de buscar conhecimento
 */
interface SearchKnowledgeParams {
    query?: string;
    tags?: string[];
    chatId: string;
}

/**
 * Interface para parâmetros da ferramenta de obter contexto
 */
interface GetContextParams {
    chatId: string;
}

/**
 * Interface para parâmetros da ferramenta de download do YouTube
 */
interface YoutubeDownloadParams {
    url: string;
    chatId: string;
}

/**
 * Interface para parâmetros da ferramenta de obter data e hora
 */
interface GetDateTimeParams {
    format?: string;
    timezone?: string;
}

/**
 * Define as ferramentas de IA para manipulação de conhecimento e outras utilidades
 * @returns Objeto com as definições das ferramentas
 */
export function aiKnowledgeTools(): Record<string, ToolDefinition> {
    const tools: Record<string, ToolDefinition> = {
        /**
         * Ferramenta para salvar conhecimento
         */
        saveKnowledge: {
            description: 'Salva um item de conhecimento na base de dados para uso futuro',
            parameters: {
                type: 'object',
                properties: {
                    title: {
                        type: 'string',
                        description: 'Título do conhecimento a ser salvo'
                    },
                    content: {
                        type: 'string',
                        description: 'Conteúdo detalhado do conhecimento'
                    },
                    tags: {
                        type: 'array',
                        items: {
                            type: 'string'
                        },
                        description: 'Tags para categorizar o conhecimento (opcional)'
                    },
                    chatId: {
                        type: 'string',
                        description: 'ID do chat onde o conhecimento será salvo'
                    }
                },
                required: ['title', 'content', 'chatId']
            },
            execute: async ({ title, content, tags = [], chatId }: SaveKnowledgeParams) => {
                try {
                    const id = knowledgeManager.addKnowledgeItem(chatId, title, content, tags);
                    logger.info(`IA salvou conhecimento usando ferramenta: ${title} (ID: ${id})`);
                    return {
                        success: true,
                        id,
                        message: `Conhecimento "${title}" salvo com sucesso.`
                    };
                } catch (error) {
                    logger.error(`Erro ao salvar conhecimento: ${(error as Error).message}`, error as Error);
                    return {
                        success: false,
                        error: (error as Error).message
                    };
                }
            }
        },

        /**
         * Ferramenta para buscar conhecimento
         */
        searchKnowledge: {
            description: 'Busca itens de conhecimento na base de dados',
            parameters: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description: 'Termo de busca (opcional)'
                    },
                    tags: {
                        type: 'array',
                        items: {
                            type: 'string'
                        },
                        description: 'Tags para filtrar os resultados (opcional)'
                    },
                    chatId: {
                        type: 'string',
                        description: 'ID do chat onde o conhecimento está armazenado'
                    }
                },
                required: ['chatId']
            },
            execute: async ({ query = '', tags = [], chatId }: SearchKnowledgeParams) => {
                try {
                    const items = knowledgeManager.searchKnowledge(chatId, query, tags);
                    logger.info(`IA buscou conhecimento usando ferramenta: ${items.length} itens encontrados`);
                    
                    if (items.length === 0) {
                        return {
                            success: true,
                            items: [],
                            message: 'Nenhum item de conhecimento encontrado.'
                        };
                    }
                    
                    return {
                        success: true,
                        items: items.map(item => ({
                            id: item.id,
                            title: item.title,
                            content: item.content,
                            tags: item.tags,
                            createdAt: item.createdAt,
                            updatedAt: item.updatedAt
                        })),
                        message: `${items.length} itens encontrados.`
                    };
                } catch (error) {
                    logger.error(`Erro ao buscar conhecimento: ${(error as Error).message}`, error as Error);
                    return {
                        success: false,
                        items: [],
                        error: (error as Error).message
                    };
                }
            }
        },

        /**
         * Ferramenta para obter contexto do chat
         */
        getContext: {
            description: 'Obtém informações contextuais sobre o chat atual',
            parameters: {
                type: 'object',
                properties: {
                    chatId: {
                        type: 'string',
                        description: 'ID do chat para obter o contexto'
                    }
                },
                required: ['chatId']
            },
            execute: async ({ chatId }: GetContextParams) => {
                try {
                    // Obter informações sobre o chat
                    const isGroup = chatId.endsWith('@g.us');
                    const chatType = isGroup ? 'grupo' : 'conversa privada';
                    
                    // Obter conhecimento disponível
                    const knowledgeItems = knowledgeManager.searchKnowledge(chatId);
                    const knowledgeCount = knowledgeItems.length;
                    
                    // Obter tags únicas
                    const uniqueTags = new Set<string>();
                    knowledgeItems.forEach(item => {
                        item.tags.forEach(tag => uniqueTags.add(tag));
                    });
                    
                    // Retornar contexto
                    return {
                        success: true,
                        context: {
                            chatId,
                            chatType,
                            isGroup,
                            knowledgeCount,
                            availableTags: Array.from(uniqueTags),
                            timestamp: new Date().toISOString()
                        }
                    };
                } catch (error) {
                    logger.error(`Erro ao obter contexto: ${(error as Error).message}`, error as Error);
                    return {
                        success: false,
                        error: (error as Error).message
                    };
                }
            }
        },

        /**
         * Ferramenta para obter um item específico de conhecimento
         */
        getKnowledgeItem: {
            description: 'Obtém um item específico de conhecimento pelo ID',
            parameters: {
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        description: 'ID do item de conhecimento'
                    },
                    chatId: {
                        type: 'string',
                        description: 'ID do chat onde o conhecimento está armazenado'
                    }
                },
                required: ['id', 'chatId']
            },
            execute: async ({ id, chatId }: { id: string, chatId: string }) => {
                try {
                    const item = knowledgeManager.getKnowledgeItem(chatId, id);
                    
                    if (!item) {
                        return {
                            success: false,
                            message: `Item de conhecimento com ID ${id} não encontrado.`
                        };
                    }
                    
                    logger.info(`IA obteve item de conhecimento usando ferramenta: ${item.title} (ID: ${id})`);
                    
                    return {
                        success: true,
                        item: {
                            id: item.id,
                            title: item.title,
                            content: item.content,
                            tags: item.tags,
                            createdAt: item.createdAt,
                            updatedAt: item.updatedAt
                        }
                    };
                } catch (error) {
                    logger.error(`Erro ao obter item de conhecimento: ${(error as Error).message}`, error as Error);
                    return {
                        success: false,
                        error: (error as Error).message
                    };
                }
            }
        },

        /**
         * Ferramenta para obter a data e hora atual
         */
        getDateTime: {
            description: 'Obtém a data e hora atual em diferentes formatos',
            parameters: {
                type: 'object',
                properties: {
                    format: {
                        type: 'string',
                        description: 'Formato da data (completo, data, hora, timestamp)'
                    },
                    timezone: {
                        type: 'string',
                        description: 'Fuso horário (padrão: America/Sao_Paulo)'
                    }
                }
            },
            execute: async ({ format = 'completo', timezone = 'America/Sao_Paulo' }: GetDateTimeParams) => {
                try {
                    // Obter data atual
                    const now = new Date();
                    
                    // Formatar data de acordo com o fuso horário
                    const options: Intl.DateTimeFormatOptions = { timeZone: timezone };
                    
                    let result: string;
                    let details: Record<string, any> = {};
                    
                    switch (format.toLowerCase()) {
                        case 'data':
                            options.dateStyle = 'full';
                            result = new Intl.DateTimeFormat('pt-BR', options).format(now);
                            break;
                        
                        case 'hora':
                            options.timeStyle = 'medium';
                            result = new Intl.DateTimeFormat('pt-BR', options).format(now);
                            break;
                        
                        case 'timestamp':
                            result = now.toISOString();
                            break;
                        
                        case 'completo':
                        default:
                            options.dateStyle = 'full';
                            options.timeStyle = 'medium';
                            result = new Intl.DateTimeFormat('pt-BR', options).format(now);
                            
                            // Adicionar detalhes
                            const dateOptions: Intl.DateTimeFormatOptions = { timeZone: timezone, dateStyle: 'full' };
                            const timeOptions: Intl.DateTimeFormatOptions = { timeZone: timezone, timeStyle: 'medium' };
                            
                            details = {
                                data: new Intl.DateTimeFormat('pt-BR', dateOptions).format(now),
                                hora: new Intl.DateTimeFormat('pt-BR', timeOptions).format(now),
                                timestamp: now.toISOString(),
                                diaDaSemana: new Intl.DateTimeFormat('pt-BR', { timeZone: timezone, weekday: 'long' }).format(now),
                                mes: new Intl.DateTimeFormat('pt-BR', { timeZone: timezone, month: 'long' }).format(now),
                                ano: now.getFullYear()
                            };
                            break;
                    }
                    
                    return {
                        success: true,
                        dateTime: result,
                        format,
                        timezone,
                        details: Object.keys(details).length > 0 ? details : undefined
                    };
                } catch (error) {
                    logger.error(`Erro ao obter data e hora: ${(error as Error).message}`, error as Error);
                    return {
                        success: false,
                        error: (error as Error).message
                    };
                }
            }
        }
    };

    // Verificar se o plugin do YouTube está disponível
    const youtubePlugin = pluginManager.getPlugin('youtube-downloader');
    if (youtubePlugin) {
        // Adicionar ferramenta para download de vídeos do YouTube
        tools.downloadYoutubeVideo = {
            description: 'Inicia o download de um vídeo do YouTube e o envia para o chat',
            parameters: {
                type: 'object',
                properties: {
                    url: {
                        type: 'string',
                        description: 'URL do vídeo do YouTube'
                    },
                    chatId: {
                        type: 'string',
                        description: 'ID do chat para onde o vídeo será enviado'
                    }
                },
                required: ['url', 'chatId']
            },
            execute: async ({ url, chatId }: YoutubeDownloadParams) => {
                try {
                    // Verificar se é um link válido do YouTube
                    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
                    if (!youtubeRegex.test(url)) {
                        return {
                            success: false,
                            message: 'O link fornecido não é um link válido do YouTube.'
                        };
                    }
                    
                    // Usar o comando do plugin para fazer o download
                    logger.info(`IA iniciou download de vídeo do YouTube: ${url}`);
                    
                    // Enviar mensagem de status
                    await messageQueue.sendStatus(chatId, {
                        text: `⏳ Iniciando download do vídeo do YouTube. Isso pode levar alguns minutos dependendo do tamanho do vídeo...`
                    });
                    
                    // Enviar comando para a fila de mensagens
                    await messageQueue.sendCommandResponse(chatId, {
                        text: `!ytdl ${url}`
                    });
                    
                    return {
                        success: true,
                        message: 'Download iniciado. O vídeo será enviado quando estiver pronto.',
                        url
                    };
                } catch (error) {
                    logger.error(`Erro ao iniciar download do YouTube: ${(error as Error).message}`, error as Error);
                    return {
                        success: false,
                        error: (error as Error).message
                    };
                }
            }
        };
    }

    // Verificar se o plugin do TikTok está disponível
    const tiktokPlugin = pluginManager.getPlugin('tiktok-downloader');
    if (tiktokPlugin) {
        // Adicionar ferramenta para download de vídeos do TikTok
        tools.downloadTikTokVideo = {
            description: 'Inicia o download de um vídeo do TikTok e o envia para o chat',
            parameters: {
                type: 'object',
                properties: {
                    url: {
                        type: 'string',
                        description: 'URL do vídeo do TikTok'
                    },
                    chatId: {
                        type: 'string',
                        description: 'ID do chat para onde o vídeo será enviado'
                    }
                },
                required: ['url', 'chatId']
            },
            execute: async ({ url, chatId }: { url: string, chatId: string }) => {
                try {
                    // Verificar se é um link válido do TikTok
                    const tiktokRegex = /^(https?:\/\/)?(www\.)?(tiktok\.com)\/.+$/;
                    if (!tiktokRegex.test(url)) {
                        return {
                            success: false,
                            message: 'O link fornecido não é um link válido do TikTok.'
                        };
                    }
                    
                    // Usar o comando do plugin para fazer o download
                    logger.info(`IA iniciou download de vídeo do TikTok: ${url}`);
                    
                    // Enviar mensagem de status
                    await messageQueue.sendStatus(chatId, {
                        text: `⏳ Iniciando download do vídeo do TikTok. Isso pode levar alguns minutos dependendo do tamanho do vídeo...`
                    });
                    
                    // Enviar comando para a fila de mensagens
                    await messageQueue.sendCommandResponse(chatId, {
                        text: `!tiktok ${url}`
                    });
                    
                    return {
                        success: true,
                        message: 'Download iniciado. O vídeo será enviado quando estiver pronto.',
                        url
                    };
                } catch (error) {
                    logger.error(`Erro ao iniciar download do TikTok: ${(error as Error).message}`, error as Error);
                    return {
                        success: false,
                        error: (error as Error).message
                    };
                }
            }
        };
    }

    return tools;
}
