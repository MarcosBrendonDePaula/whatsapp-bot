import { Connection, MessageHandler } from './core';
import commands from './commands';
import logger from './utils/logger';
import * as fs from 'fs';
import * as path from 'path';

async function startBot(): Promise<void> {
    try {
        // Inicializar o manipulador de mensagens
        const messageHandler = new MessageHandler();

        // Registrar todos os comandos
        messageHandler.registerCommands(commands);

        // Inicializar a conexão
        const connection = new Connection();

        // Configurar o manipulador de mensagens
        connection.setMessageHandler(messageHandler);

        // Iniciar o bot
        await connection.initialize();

        logger.info('Bot inicializado com sucesso!');
    } catch (error) {
        logger.error(`Erro ao iniciar o bot: ${(error as Error).message}`);
        process.exit(1);
    }
}

// Iniciar o bot
startBot();