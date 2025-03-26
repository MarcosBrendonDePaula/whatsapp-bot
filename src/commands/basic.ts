import config from '../config';
import logger from '../utils/logger';
import { Commands } from '../types';

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

    ajuda: async ({ sock, sender }) => {
        await sock.sendMessage(sender, {
            text: `🤖 *${config.botName} - Comandos disponíveis* 🤖\n\n` +
                `${config.prefix}ping - Testar se o bot está online\n` +
                `${config.prefix}oi - Saudação\n` +
                `${config.prefix}ajuda - Mostrar esta mensagem de ajuda\n` +
                `${config.prefix}hora - Mostrar a hora atual\n\n` +
                `Desenvolvido com ❤️`
        });
    }
};

export default basicCommands;