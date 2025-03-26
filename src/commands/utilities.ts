import logger from '../utils/logger';
import { Commands } from '../types';

const utilitiesCommands: Commands = {
    hora: async ({ sock, sender }) => {
        const now = new Date();
        await sock.sendMessage(sender, {
            text: `A hora atual é: ${now.toLocaleTimeString('pt-BR')}`
        });
    },

    data: async ({ sock, sender }) => {
        const now = new Date();
        const options: Intl.DateTimeFormatOptions = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };
        await sock.sendMessage(sender, {
            text: `Hoje é: ${now.toLocaleDateString('pt-BR', options)}`
        });
    },

    echo: async ({ sock, sender, args }) => {
        if (args.length === 0) {
            await sock.sendMessage(sender, { text: 'Por favor, forneça um texto para eu repetir.' });
            return;
        }

        const text = args.join(' ');
        await sock.sendMessage(sender, { text });
    }
};

export default utilitiesCommands;