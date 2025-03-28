import { WASocket } from '@whiskeysockets/baileys';
import * as fs from 'fs';
import * as path from 'path';
import { Commands } from '../types';
import logger from '../utils/logger';
import { Plugin } from './base-plugin';

/**
 * Gerenciador de plugins
 * Responsável por carregar, inicializar e gerenciar plugins
 */
class PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  private sock: WASocket | null = null;
  
  /**
   * Carrega todos os plugins do diretório especificado
   * @param pluginsDir Diretório onde os plugins estão localizados
   */
  public async loadPlugins(pluginsDir: string): Promise<void> {
    try {
      logger.info(`Carregando plugins do diretório: ${pluginsDir}`);
      
      // Verificar se o diretório existe
      if (!fs.existsSync(pluginsDir)) {
        logger.warn(`Diretório de plugins não encontrado: ${pluginsDir}`);
        return;
      }
      
      // Obter todos os arquivos e diretórios no diretório de plugins
      const items = fs.readdirSync(pluginsDir);
      logger.debug(`Encontrados ${items.length} itens no diretório de plugins`);
      
      for (const item of items) {
        // Ignorar arquivos base e utilitários
        if (item === 'base-plugin.ts' || item === 'plugin-manager.ts') {
          logger.debug(`Ignorando arquivo utilitário: ${item}`);
          continue;
        }
        
        const itemPath = path.join(pluginsDir, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
          // Se for um diretório, procurar pelo arquivo index.ts ou index.js
          const indexPath = path.join(itemPath, 'index.ts');
          const indexJsPath = path.join(itemPath, 'index.js');
          
          logger.debug(`Verificando plugin em diretório: ${item}`);
          
          if (fs.existsSync(indexPath)) {
            logger.debug(`Encontrado arquivo index.ts em ${item}`);
            await this.loadPlugin(itemPath);
          } else if (fs.existsSync(indexJsPath)) {
            logger.debug(`Encontrado arquivo index.js em ${item}`);
            await this.loadPlugin(itemPath);
          } else {
            logger.debug(`Nenhum arquivo index encontrado em ${item}`);
          }
        } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.js'))) {
          // Se for um arquivo .ts ou .js, carregar como plugin
          logger.debug(`Verificando plugin em arquivo: ${item}`);
          await this.loadPlugin(itemPath);
        }
      }
      
      logger.info(`${this.plugins.size} plugins carregados`);
      
      // Listar plugins carregados
      if (this.plugins.size > 0) {
        const pluginNames = Array.from(this.plugins.keys()).join(', ');
        logger.info(`Plugins carregados: ${pluginNames}`);
      }
    } catch (error) {
      logger.error(`Erro ao carregar plugins: ${(error as Error).message}`, error as Error);
    }
  }
  
  /**
   * Carrega um plugin específico
   * @param pluginPath Caminho para o plugin
   */
  private async loadPlugin(pluginPath: string): Promise<void> {
    try {
      logger.debug(`Tentando carregar plugin de: ${pluginPath}`);
      
      // Importar o plugin
      logger.debug(`Importando módulo: ${pluginPath}`);
      const pluginModule = await import(pluginPath);
      
      // Verificar se o módulo exporta um plugin
      if (!pluginModule.default) {
        logger.warn(`Módulo em ${pluginPath} não exporta um plugin como default`);
        return;
      }
      
      logger.debug(`Módulo importado com sucesso, criando instância do plugin`);
      
      // Criar instância do plugin
      const plugin: Plugin = new pluginModule.default();
      
      // Verificar se é um plugin válido
      if (!plugin.name) {
        logger.warn(`Módulo em ${pluginPath} não tem nome de plugin válido`);
        return;
      }
      
      if (!plugin.initialize) {
        logger.warn(`Módulo em ${pluginPath} não tem método initialize`);
        return;
      }
      
      if (!plugin.getCommands) {
        logger.warn(`Módulo em ${pluginPath} não tem método getCommands`);
        return;
      }
      
      // Adicionar o plugin ao mapa
      this.plugins.set(plugin.name, plugin);
      logger.info(`Plugin carregado: ${plugin.name} v${plugin.version}`);
    } catch (error) {
      logger.error(`Erro ao carregar plugin ${pluginPath}: ${(error as Error).message}`, error as Error);
      logger.debug(`Stack trace: ${(error as Error).stack}`);
    }
  }
  
  /**
   * Inicializa todos os plugins carregados
   * @param sock Instância do socket do WhatsApp
   */
  public async initializePlugins(sock: WASocket): Promise<void> {
    this.sock = sock;
    
    for (const [name, plugin] of this.plugins.entries()) {
      try {
        await plugin.initialize(sock);
        logger.info(`Plugin ${name} inicializado`);
      } catch (error) {
        logger.error(`Erro ao inicializar plugin ${name}: ${(error as Error).message}`, error as Error);
      }
    }
  }
  
  /**
   * Obtém todos os comandos de todos os plugins
   * @returns Objeto com todos os comandos
   */
  public getAllCommands(): Commands {
    const allCommands: Commands = {};
    
    logger.debug('Obtendo comandos de todos os plugins');
    
    for (const plugin of this.plugins.values()) {
      logger.debug(`Obtendo comandos do plugin: ${plugin.name}`);
      const commands = plugin.getCommands();
      
      // Listar comandos do plugin
      const commandNames = Object.keys(commands);
      if (commandNames.length > 0) {
        logger.debug(`Plugin ${plugin.name} fornece os comandos: ${commandNames.join(', ')}`);
      } else {
        logger.debug(`Plugin ${plugin.name} não fornece comandos`);
      }
      
      Object.assign(allCommands, commands);
    }
    
    // Listar todos os comandos coletados
    const allCommandNames = Object.keys(allCommands);
    logger.debug(`Total de comandos coletados: ${allCommandNames.length}`);
    if (allCommandNames.length > 0) {
      logger.debug(`Comandos disponíveis: ${allCommandNames.join(', ')}`);
    }
    
    return allCommands;
  }
  
  /**
   * Desliga todos os plugins
   */
  public async shutdownPlugins(): Promise<void> {
    for (const [name, plugin] of this.plugins.entries()) {
      try {
        await plugin.onShutdown();
        logger.info(`Plugin ${name} desligado`);
      } catch (error) {
        logger.error(`Erro ao desligar plugin ${name}: ${(error as Error).message}`, error as Error);
      }
    }
  }
  
  /**
   * Obtém um plugin pelo nome
   * @param name Nome do plugin
   * @returns Plugin ou undefined se não encontrado
   */
  public getPlugin(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }
  
  /**
   * Obtém todos os plugins
   * @returns Array com todos os plugins
   */
  public getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }
}

export default new PluginManager();
