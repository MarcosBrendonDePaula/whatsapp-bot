import * as winston from 'winston';
import 'winston-daily-rotate-file';
import * as fs from 'fs';
import * as path from 'path';
import config from '../config';

// Garantir que o diretório de logs existe
const logDir = path.resolve(config.logging.dir);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Configurar o formato dos logs
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Configurar o formato para console
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `[${timestamp}] [${level}]: ${message}`;
    
    // Adicionar metadados se existirem
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    
    return msg;
  })
);

// Criar transporte para rotação de arquivos
const fileRotateTransport = new winston.transports.DailyRotateFile({
  filename: path.join(logDir, `%DATE%.log`),
  datePattern: config.logging.rotation.datePattern,
  maxSize: config.logging.rotation.maxSize,
  maxFiles: config.logging.rotation.maxFiles,
  format: logFormat
});

// Criar array de transportes
const transports: winston.transport[] = [fileRotateTransport];

// Adicionar transporte de console se configurado
if (config.logging.console) {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat
    })
  );
}

// Criar o logger
const logger = winston.createLogger({
  level: config.logging.level,
  transports
});

// Interface para compatibilidade com o código existente
class Logger {
  public info(message: any): void {
    logger.info(this.formatMessage(message));
  }

  public warn(message: any): void {
    logger.warn(this.formatMessage(message));
  }

  public error(message: any, error?: Error): void {
    if (error) {
      logger.error(this.formatMessage(message), { error: error.stack });
    } else {
      logger.error(this.formatMessage(message));
    }
  }

  public debug(message: any): void {
    logger.debug(this.formatMessage(message));
  }

  public trace(message: any): void {
    logger.silly(this.formatMessage(message));
  }

  public child(): Logger {
    // Retorna uma nova instância do logger com as mesmas configurações
    return new Logger();
  }

  private formatMessage(message: any): string {
    return typeof message === 'string' ? message : JSON.stringify(message);
  }
}

export default new Logger();
