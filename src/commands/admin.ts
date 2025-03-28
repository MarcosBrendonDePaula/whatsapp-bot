import { Command, CommandParams } from '../types';
import logger from '../utils/logger';
import config from '../config';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import pluginManager from '../plugins/plugin-manager';
import { StateManager } from '../core';

// Armazenar estatísticas do bot
const botStats = {
    startTime: new Date(),
    messagesProcessed: 0,
    commandsExecuted: 0,
    errors: 0
};

// Incrementar contador de mensagens processadas
export const incrementMessageCount = (): void => {
    botStats.messagesProcessed++;
};

// Incrementar contador de comandos executados
export const incrementCommandCount = (): void => {
    botStats.commandsExecuted++;
};

// Incrementar contador de erros
export const incrementErrorCount = (): void => {
    botStats.errors++;
};

/**
 * Comando para reiniciar o bot
 */
const reiniciar: Command = async ({ sock, sender, isGroup }: CommandParams) => {
    // Verificar se o comando veio do dono do bot
    if (!isOwner(sender)) {
        await sock.sendMessage(sender, {
            text: '❌ Apenas o dono do bot pode usar este comando.'
        });
        return;
    }

    await sock.sendMessage(sender, {
        text: '🔄 Reiniciando o bot em 5 segundos...'
    });
    
    logger.info(`Bot será reiniciado por comando do usuário ${sender}`);
    
    // Aguardar 5 segundos e encerrar o processo
    setTimeout(() => {
        process.exit(0); // O processo será reiniciado pelo nodemon ou sistema de gerenciamento
    }, 5000);
};

/**
 * Comando para ver estatísticas do bot
 */
const status: Command = async ({ sock, sender }: CommandParams) => {
    // Calcular tempo online
    const uptime = getUptime();
    
    // Obter uso de memória
    const memoryUsage = process.memoryUsage();
    const memoryUsageMB = Math.round(memoryUsage.rss / 1024 / 1024);
    
    // Obter informações do sistema
    const cpuUsage = os.loadavg()[0].toFixed(2);
    const totalMemory = Math.round(os.totalmem() / 1024 / 1024 / 1024);
    const freeMemory = Math.round(os.freemem() / 1024 / 1024 / 1024);
    
    // Obter número de plugins carregados
    const pluginsCount = pluginManager.getAllPlugins().length;
    
    // Obter número de estados ativos
    const activeStates = StateManager.getUsersInState('').length;
    
    const statusMessage = `📊 *Status do Bot*\n\n` +
        `⏱️ *Tempo online:* ${uptime}\n` +
        `📨 *Mensagens processadas:* ${botStats.messagesProcessed}\n` +
        `🔧 *Comandos executados:* ${botStats.commandsExecuted}\n` +
        `❌ *Erros:* ${botStats.errors}\n\n` +
        `🧩 *Plugins carregados:* ${pluginsCount}\n` +
        `📝 *Estados ativos:* ${activeStates}\n` +
        `💾 *Uso de memória:* ${memoryUsageMB} MB\n` +
        `🖥️ *CPU:* ${cpuUsage}%\n` +
        `💻 *Memória do sistema:* ${freeMemory}GB livre de ${totalMemory}GB\n` +
        `🤖 *Versão do Node:* ${process.version}`;
    
    await sock.sendMessage(sender, {
        text: statusMessage
    });
};

/**
 * Comando para listar plugins carregados
 */
const plugins: Command = async ({ sock, sender }: CommandParams) => {
    const allPlugins = pluginManager.getAllPlugins();
    
    if (allPlugins.length === 0) {
        await sock.sendMessage(sender, {
            text: '❌ Nenhum plugin carregado.'
        });
        return;
    }
    
    let message = '🧩 *Plugins Carregados*\n\n';
    
    allPlugins.forEach(plugin => {
        message += `• *${plugin.name}* v${plugin.version}\n`;
        message += `  ${plugin.description}\n\n`;
    });
    
    await sock.sendMessage(sender, {
        text: message
    });
};

/**
 * Comando para ver logs recentes
 */
const logs: Command = async ({ sock, sender, args }: CommandParams) => {
    // Verificar se o comando veio do dono do bot
    if (!isOwner(sender)) {
        await sock.sendMessage(sender, {
            text: '❌ Apenas o dono do bot pode usar este comando.'
        });
        return;
    }
    
    // Número de linhas para mostrar (padrão: 10)
    const lines = args.length > 0 ? parseInt(args[0]) : 10;
    
    if (isNaN(lines) || lines <= 0) {
        await sock.sendMessage(sender, {
            text: '❌ Número de linhas inválido. Use um número positivo.'
        });
        return;
    }
    
    try {
        // Obter o arquivo de log mais recente
        const logDir = path.resolve(config.logging.dir);
        if (!fs.existsSync(logDir)) {
            await sock.sendMessage(sender, {
                text: '❌ Diretório de logs não encontrado.'
            });
            return;
        }
        
        // Listar arquivos no diretório de logs
        const files = fs.readdirSync(logDir)
            .filter(file => file.endsWith('.log'))
            .sort()
            .reverse(); // Mais recente primeiro
        
        if (files.length === 0) {
            await sock.sendMessage(sender, {
                text: '❌ Nenhum arquivo de log encontrado.'
            });
            return;
        }
        
        const latestLogFile = path.join(logDir, files[0]);
        
        // Ler o arquivo de log
        const logContent = fs.readFileSync(latestLogFile, 'utf8');
        
        // Obter as últimas linhas
        const logLines = logContent.split('\n').filter(line => line.trim() !== '');
        const lastLines = logLines.slice(-lines);
        
        let message = `📜 *Últimas ${lastLines.length} linhas de log*\n\n`;
        lastLines.forEach(line => {
            // Limitar o tamanho de cada linha para evitar mensagens muito grandes
            const shortLine = line.length > 100 ? line.substring(0, 97) + '...' : line;
            message += `${shortLine}\n\n`;
        });
        
        await sock.sendMessage(sender, {
            text: message
        });
    } catch (error) {
        logger.error(`Erro ao ler logs: ${(error as Error).message}`, error as Error);
        await sock.sendMessage(sender, {
            text: `❌ Erro ao ler logs: ${(error as Error).message}`
        });
    }
};

/**
 * Comando para ajuda administrativa
 */
const ajudaAdmin: Command = async ({ sock, sender }: CommandParams) => {
    const message = `🔧 *Comandos Administrativos*\n\n` +
        `• *!status* - Mostra estatísticas do bot\n` +
        `• *!plugins* - Lista plugins carregados\n` +
        `• *!logs [n]* - Mostra as últimas n linhas de log (padrão: 10)\n` +
        `• *!reiniciar* - Reinicia o bot\n` +
        `• *!limparsessao* - Limpa a sessão e força nova autenticação\n` +
        `• *!estados* - Gerencia estados de usuários\n`;
    
    await sock.sendMessage(sender, {
        text: message
    });
};

// Função auxiliar para verificar se o remetente é o dono do bot
function isOwner(sender: string): boolean {
    // Remover sufixo @s.whatsapp.net se presente
    const senderNumber = sender.split('@')[0];
    return senderNumber === config.ownerNumber;
}

// Função auxiliar para formatar o tempo online
function getUptime(): string {
    const now = new Date();
    const diff = now.getTime() - botStats.startTime.getTime();
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    let uptime = '';
    if (days > 0) uptime += `${days}d `;
    if (hours > 0) uptime += `${hours}h `;
    if (minutes > 0) uptime += `${minutes}m `;
    uptime += `${seconds}s`;
    
    return uptime;
}

/**
 * Comando para gerenciar estados
 */
const estados: Command = async ({ sock, sender, args }: CommandParams) => {
    // Verificar se o comando veio do dono do bot
    if (!isOwner(sender)) {
        await sock.sendMessage(sender, {
            text: '❌ Apenas o dono do bot pode usar este comando.'
        });
        return;
    }
    
    // Se não houver argumentos, mostrar ajuda
    if (args.length === 0) {
        await sock.sendMessage(sender, {
            text: `🔄 *Gerenciamento de Estados*\n\n` +
                `Comandos disponíveis:\n` +
                `• *!estados listar* - Lista todos os estados ativos\n` +
                `• *!estados limpar [userId]* - Limpa o estado de um usuário específico\n` +
                `• *!estados limpartodos* - Limpa todos os estados\n` +
                `• *!estados salvar* - Força o salvamento dos estados\n` +
                `• *!estados info [userId]* - Mostra informações detalhadas de um estado`
        });
        return;
    }
    
    const subCommand = args[0].toLowerCase();
    
    switch (subCommand) {
        case 'listar': {
            // Obter todos os estados
            const states = StateManager.getUsersInState('');
            
            if (states.length === 0) {
                await sock.sendMessage(sender, {
                    text: '📝 Não há estados ativos no momento.'
                });
                return;
            }
            
            let message = `📝 *Estados Ativos (${states.length})*\n\n`;
            
            for (const userId of states) {
                const state = StateManager.getState(userId);
                if (state) {
                    const shortUserId = userId.split('@')[0];
                    message += `• *${shortUserId}*: ${state.pluginName} (${state.currentState})\n`;
                }
            }
            
            await sock.sendMessage(sender, {
                text: message
            });
            break;
        }
        
        case 'limpar': {
            if (args.length < 2) {
                await sock.sendMessage(sender, {
                    text: '❌ Especifique o ID do usuário para limpar o estado.'
                });
                return;
            }
            
            const userId = args[1].includes('@') ? args[1] : `${args[1]}@s.whatsapp.net`;
            const cleared = StateManager.clearState(userId);
            
            if (cleared) {
                await sock.sendMessage(sender, {
                    text: `✅ Estado do usuário ${args[1]} foi limpo com sucesso.`
                });
            } else {
                await sock.sendMessage(sender, {
                    text: `❌ Usuário ${args[1]} não possui estado ativo.`
                });
            }
            break;
        }
        
        case 'limpartodos': {
            const states = StateManager.getUsersInState('');
            let count = 0;
            
            for (const userId of states) {
                const cleared = StateManager.clearState(userId);
                if (cleared) count++;
            }
            
            await sock.sendMessage(sender, {
                text: `✅ ${count} estados foram limpos.`
            });
            break;
        }
        
        case 'salvar': {
            StateManager.saveStates();
            await sock.sendMessage(sender, {
                text: '✅ Estados salvos com sucesso.'
            });
            break;
        }
        
        case 'info': {
            if (args.length < 2) {
                await sock.sendMessage(sender, {
                    text: '❌ Especifique o ID do usuário para ver informações do estado.'
                });
                return;
            }
            
            const userId = args[1].includes('@') ? args[1] : `${args[1]}@s.whatsapp.net`;
            const state = StateManager.getState(userId);
            
            if (!state) {
                await sock.sendMessage(sender, {
                    text: `❌ Usuário ${args[1]} não possui estado ativo.`
                });
                return;
            }
            
            const createdDate = new Date(state.createdAt);
            const updatedDate = new Date(state.updatedAt);
            
            let message = `📝 *Informações do Estado*\n\n` +
                `• *Usuário:* ${args[1]}\n` +
                `• *Plugin:* ${state.pluginName}\n` +
                `• *Estado:* ${state.currentState}\n` +
                `• *Criado em:* ${createdDate.toLocaleString()}\n` +
                `• *Atualizado em:* ${updatedDate.toLocaleString()}\n\n` +
                `• *Dados:*\n${JSON.stringify(state.data, null, 2)}`;
            
            await sock.sendMessage(sender, {
                text: message
            });
            break;
        }
        
        default:
            await sock.sendMessage(sender, {
                text: `❌ Subcomando desconhecido: ${subCommand}\n` +
                    `Use !estados para ver os comandos disponíveis.`
            });
    }
};

// Exportar comandos
export default {
    'reiniciar': reiniciar,
    'status': status,
    'plugins': plugins,
    'logs': logs,
    'ajudaadmin': ajudaAdmin,
    'estados': estados
};
