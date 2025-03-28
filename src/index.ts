import { Connection, MessageHandler, StateManager } from './core';
import commands from './commands';
import config from './config';
import logger from './utils/logger';
import * as fs from 'fs';
import * as path from 'path';
import pluginManager from './plugins/plugin-manager';

// Capturar sinais de encerramento para desligar corretamente
process.on('SIGINT', async () => {
    logger.info('Recebido sinal de encerramento, desligando...');
    await pluginManager.shutdownPlugins();
    await StateManager.onShutdown();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    logger.info('Recebido sinal de encerramento, desligando...');
    await pluginManager.shutdownPlugins();
    await StateManager.onShutdown();
    process.exit(0);
});

// Capturar exceções não tratadas
process.on('uncaughtException', (error) => {
    logger.error(`Exceção não tratada: ${error.message}`, error);
    logger.info('O bot continuará em execução, mas pode estar em um estado inconsistente');
});

// Capturar rejeições de promessas não tratadas
process.on('unhandledRejection', (reason, promise) => {
    logger.error(`Rejeição de promessa não tratada: ${reason}`, reason as Error);
    logger.info('O bot continuará em execução, mas pode estar em um estado inconsistente');
});

async function startBot(): Promise<void> {
    try {
        logger.info('Iniciando WhatsApp Bot...');
        
        // Inicializar o manipulador de mensagens
        const messageHandler = new MessageHandler();

        // Registrar comandos básicos
        messageHandler.registerCommands(commands);
        logger.info('Comandos básicos registrados');

        // Carregar e inicializar plugins
        await pluginManager.loadPlugins(config.plugins.dir);
        
        // Inicializar a conexão
        const connection = new Connection();

        // Configurar o manipulador de mensagens
        connection.setMessageHandler(messageHandler);

        // Iniciar o bot
        const sock = await connection.initialize();
        
        // Inicializar plugins com a conexão
        await pluginManager.initializePlugins(sock);
        
        // Registrar comandos dos plugins
        const pluginCommands = pluginManager.getAllCommands();
        messageHandler.registerCommands(pluginCommands);
        logger.info(`${Object.keys(pluginCommands).length} comandos de plugins registrados`);

        logger.info('Bot inicializado com sucesso!');
    } catch (error) {
        logger.error(`Erro ao iniciar o bot: ${(error as Error).message}`, error as Error);
        process.exit(1);
    }
}

// Iniciar o bot
startBot();
