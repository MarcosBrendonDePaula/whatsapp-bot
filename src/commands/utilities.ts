import { Command, CommandParams } from '../types';
import logger from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';
import config from '../config';

/**
 * Comando para verificar se o bot está online
 */
const ping: Command = async ({ sock, sender }: CommandParams) => {
    await sock.sendMessage(sender, {
        text: 'Pong! O bot está online.'
    });
};

/**
 * Comando para limpar a sessão e forçar nova autenticação
 */
const limparSessao: Command = async ({ sock, sender }: CommandParams) => {
    try {
        const sessionDir = path.resolve(config.sessionPath);
        if (fs.existsSync(sessionDir)) {
            // Informar que a sessão será limpa
            await sock.sendMessage(sender, {
                text: 'Limpando arquivos de sessão. Você precisará escanear o QR code novamente.'
            });
            
            logger.info(`Limpando arquivos de sessão em ${sessionDir} por comando do usuário`);
            
            // Ler todos os arquivos no diretório
            const files = fs.readdirSync(sessionDir);
            
            // Excluir cada arquivo
            for (const file of files) {
                const filePath = path.join(sessionDir, file);
                fs.unlinkSync(filePath);
                logger.debug(`Arquivo de sessão removido: ${filePath}`);
            }
            
            logger.info('Arquivos de sessão limpos com sucesso');
            
            // Informar que o bot será reiniciado
            await sock.sendMessage(sender, {
                text: 'Sessão limpa com sucesso. O bot será reiniciado em 5 segundos.'
            });
            
            // Aguardar 5 segundos e encerrar o processo
            // O processo será reiniciado pelo nodemon em desenvolvimento
            // ou pelo sistema de gerenciamento de processos em produção
            setTimeout(() => {
                logger.info('Reiniciando o bot após limpeza de sessão');
                process.exit(0);
            }, 5000);
        } else {
            await sock.sendMessage(sender, {
                text: 'Diretório de sessão não encontrado.'
            });
        }
    } catch (error) {
        logger.error(`Erro ao limpar sessão: ${(error as Error).message}`, error as Error);
        await sock.sendMessage(sender, {
            text: `Erro ao limpar sessão: ${(error as Error).message}`
        });
    }
};

// Exportar comandos
export default {
    'ping': ping,
    'limparsessao': limparSessao
};
