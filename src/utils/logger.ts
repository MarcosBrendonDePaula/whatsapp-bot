enum LogLevel {
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR',
    DEBUG = 'DEBUG',
    TRACE = 'TRACE'
  }
  
  class Logger {
    private level: string = 'info';
  
    private getTimestamp(): string {
      return new Date().toISOString();
    }
  
    public info(message: any): void {
      const formattedMessage = typeof message === 'string' ? message : JSON.stringify(message);
      console.log(`[${this.getTimestamp()}] [${LogLevel.INFO}]: ${formattedMessage}`);
    }
  
    public warn(message: any): void {
      const formattedMessage = typeof message === 'string' ? message : JSON.stringify(message);
      console.warn(`[${this.getTimestamp()}] [${LogLevel.WARN}]: ${formattedMessage}`);
    }
  
    public error(message: any, error?: Error): void {
      const formattedMessage = typeof message === 'string' ? message : JSON.stringify(message);
      console.error(`[${this.getTimestamp()}] [${LogLevel.ERROR}]: ${formattedMessage}`);
      if (error) {
        console.error(error);
      }
    }
  
    public debug(message: any): void {
      const formattedMessage = typeof message === 'string' ? message : JSON.stringify(message);
      console.debug(`[${this.getTimestamp()}] [${LogLevel.DEBUG}]: ${formattedMessage}`);
    }
  
    public trace(message: any): void {
      const formattedMessage = typeof message === 'string' ? message : JSON.stringify(message);
      console.debug(`[${this.getTimestamp()}] [${LogLevel.TRACE}]: ${formattedMessage}`);
    }
  
    public child(): Logger {
      // Retorna uma nova instância do logger com as mesmas configurações
      return new Logger();
    }
  }
  
  export default new Logger();