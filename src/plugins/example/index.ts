import { proto } from '@whiskeysockets/baileys';
import { BasePlugin } from '../base-plugin';
import { CommandParams } from '../../types';
import logger from '../../utils/logger';

/**
 * Plugin de exemplo para demonstrar como criar plugins
 */
export default class ExamplePlugin extends BasePlugin {
  constructor() {
    super(
      'example', // Nome do plugin
      'Plugin de exemplo para demonstração', // Descrição
      '1.0.0' // Versão
    );
  }
  
  /**
   * Método chamado quando o plugin é inicializado
   */
  protected async onInitialize(): Promise<void> {
    // Registrar comandos
    this.registerCommand('exemplo', this.exampleCommand.bind(this));
    this.registerCommand('eco', this.echoCommand.bind(this));
    
    logger.info('Plugin de exemplo inicializado com sucesso');
  }
  
  /**
   * Comando de exemplo
   */
  private async exampleCommand(params: CommandParams): Promise<void> {
    const { sock, sender } = params;
    
    await sock.sendMessage(sender, {
      text: 'Este é um comando de exemplo do plugin de exemplo!'
    });
  }
  
  /**
   * Comando de eco que repete o que o usuário enviou
   */
  private async echoCommand(params: CommandParams): Promise<void> {
    const { sock, sender, args } = params;
    
    const message = args.join(' ');
    
    if (!message) {
      await sock.sendMessage(sender, {
        text: 'Por favor, forneça uma mensagem para ecoar.'
      });
      return;
    }
    
    await sock.sendMessage(sender, {
      text: `Eco: ${message}`
    });
  }
  
  /**
   * Método chamado quando o bot é desligado
   */
  public async onShutdown(): Promise<void> {
    logger.info('Plugin de exemplo está sendo desligado');
    // Realizar limpeza se necessário
    await super.onShutdown();
  }
}
