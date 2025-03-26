import { WASocket } from '@whiskeysockets/baileys';
import { Commands } from '../types';
import logger from '../utils/logger';

/**
 * Interface que define a estrutura de um plugin
 */
export interface Plugin {
  /**
   * Nome do plugin
   */
  name: string;
  
  /**
   * Descrição do plugin
   */
  description: string;
  
  /**
   * Versão do plugin
   */
  version: string;
  
  /**
   * Inicializa o plugin
   * @param sock Instância do socket do WhatsApp
   */
  initialize(sock: WASocket): Promise<void>;
  
  /**
   * Retorna os comandos fornecidos pelo plugin
   */
  getCommands(): Commands;
  
  /**
   * Método chamado quando o bot é desligado
   */
  onShutdown(): Promise<void>;
}

/**
 * Classe base para plugins
 * Implementa a interface Plugin e fornece funcionalidades básicas
 */
export abstract class BasePlugin implements Plugin {
  public name: string;
  public description: string;
  public version: string;
  protected sock: WASocket | null = null;
  protected commands: Commands = {};
  
  constructor(name: string, description: string, version: string) {
    this.name = name;
    this.description = description;
    this.version = version;
  }
  
  /**
   * Inicializa o plugin
   * @param sock Instância do socket do WhatsApp
   */
  public async initialize(sock: WASocket): Promise<void> {
    this.sock = sock;
    logger.info(`Plugin ${this.name} v${this.version} inicializado`);
    await this.onInitialize();
  }
  
  /**
   * Método a ser implementado pelos plugins para inicialização personalizada
   */
  protected abstract onInitialize(): Promise<void>;
  
  /**
   * Retorna os comandos fornecidos pelo plugin
   */
  public getCommands(): Commands {
    return this.commands;
  }
  
  /**
   * Método chamado quando o bot é desligado
   */
  public async onShutdown(): Promise<void> {
    logger.info(`Plugin ${this.name} desligado`);
  }
  
  /**
   * Registra um comando no plugin
   * @param name Nome do comando
   * @param handler Função que manipula o comando
   */
  protected registerCommand(name: string, handler: Commands[string]): void {
    this.commands[name] = handler;
    logger.debug(`Plugin ${this.name} registrou o comando: ${name}`);
  }
}
