import config from '../config';
import logger from '../utils/logger';
import { Commands } from '../types';
import pluginManager from '../plugins/plugin-manager';

const basicCommands: Commands = {
    ping: async ({ sock, sender }) => {
        await sock.sendMessage(sender, { text: 'Pong! 🏓' });
    },

    oi: async ({ sock, sender }) => {
        await sock.sendMessage(sender, { text: `Olá! Eu sou o ${config.botName}. Como posso ajudar você hoje?` });
    },

    ola: async ({ sock, sender }) => {
        // Redirecionar para o comando 'oi'
        return basicCommands.oi({ sock, sender } as any);
    },

    olá: async ({ sock, sender }) => {
        // Redirecionar para o comando 'oi'
        return basicCommands.oi({ sock, sender } as any);
    },

    hora: async ({ sock, sender }) => {
        const now = new Date();
        await sock.sendMessage(sender, { 
            text: `🕒 A hora atual é: ${now.toLocaleTimeString('pt-BR')}` 
        });
    },

    data: async ({ sock, sender }) => {
        const now = new Date();
        await sock.sendMessage(sender, { 
            text: `📅 A data atual é: ${now.toLocaleDateString('pt-BR')}` 
        });
    },

    ajuda: async ({ sock, sender }) => {
        // Comandos básicos
        let message = `🤖 *${config.botName} - Comandos disponíveis* 🤖\n\n`;
        
        message += `*Comandos Básicos:*\n`;
        message += `${config.prefix}ping - Testar se o bot está online\n`;
        message += `${config.prefix}oi - Saudação\n`;
        message += `${config.prefix}hora - Mostrar a hora atual\n`;
        message += `${config.prefix}data - Mostrar a data atual\n`;
        message += `${config.prefix}ajuda - Mostrar esta mensagem de ajuda\n\n`;
        
        // Comandos utilitários
        message += `*Comandos Utilitários:*\n`;
        message += `${config.prefix}limparsessao - Limpar sessão e reconectar\n\n`;
        
        // Comandos administrativos
        message += `*Comandos Administrativos:*\n`;
        message += `${config.prefix}status - Ver estatísticas do bot\n`;
        message += `${config.prefix}plugins - Listar plugins carregados\n`;
        message += `${config.prefix}logs - Ver logs recentes\n`;
        message += `${config.prefix}reiniciar - Reiniciar o bot\n`;
        message += `${config.prefix}ajudaadmin - Ver ajuda administrativa\n\n`;
        
        // Plugins
        const plugins = pluginManager.getAllPlugins();
        if (plugins.length > 0) {
            message += `*Plugins:*\n`;
            message += `Há ${plugins.length} plugin(s) carregado(s).\n`;
            message += `Use ${config.prefix}plugins para ver detalhes.\n\n`;
        }
        
        message += `Desenvolvido com ❤️`;
        
        await sock.sendMessage(sender, { text: message });
    }
};

export default basicCommands;
