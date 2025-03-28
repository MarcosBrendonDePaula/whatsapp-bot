import { Config } from './types';
import * as path from 'path';

// Atualizar a interface Config no arquivo types/index.ts
const config: Config = {
    // Configurações gerais do bot
    sessionPath: './.data/session',
    prefix: '!',
    ownerNumber: '5567998808948', // Substitua pelo seu número
    botName: 'MarcosTools',
    
    // Configurações de logging
    logging: {
        // Diretório onde os logs serão armazenados
        dir: './logs',
        // Nível de log (error, warn, info, debug, trace)
        level: 'debug',
        // Configurações de rotação de logs
        rotation: {
            // Tamanho máximo do arquivo de log antes de rotacionar
            maxSize: '10m',
            // Número máximo de arquivos de log a manter
            maxFiles: 7,
            // Formato do nome do arquivo de log
            datePattern: 'YYYY-MM-DD',
        },
        // Se deve mostrar logs no console
        console: true
    },
    
    // Configurações de plugins
    plugins: {
        // Diretório onde os plugins estão localizados
        dir: path.join(__dirname, 'plugins'),
        // Plugins habilitados (deixe vazio para carregar todos)
        enabled: [],
        // Plugins desabilitados (ignorados durante o carregamento)
        disabled: []
    },
    
    // Configurações do sistema de estados
    states: {
        // Tempo máximo (em horas) para manter estados inativos
        maxAgeHours: 24,
        // Intervalo (em minutos) para salvar estados automaticamente
        saveInterval: 5
    },
    
    // Configurações de sincronização de histórico
    historySync: {
        // Se deve sincronizar o histórico de mensagens
        enabled: true,
        // Diretório para armazenar o histórico (opcional, se não fornecido, não será salvo em disco)
        storageDir: './.data/history'
    }
};

export default config;
