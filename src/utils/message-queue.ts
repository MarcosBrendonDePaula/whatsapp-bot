import { WASocket } from '@whiskeysockets/baileys';
import logger from './logger';
import * as crypto from 'crypto';

/**
 * Classe para gerenciar a fila de mensagens e evitar envio em massa
 * que pode levar ao banimento do WhatsApp
 */
class MessageQueue {
  private queue: Array<{
    jid: string;
    content: any;
    priority: number;
  }> = [];
  private processing: boolean = false;
  private minDelay: number = 5000; // 5 segundos entre mensagens normais
  private priorityDelay: number = 3000; // 3 segundos entre mensagens prioritárias
  private sock: WASocket | null = null;
  
  /**
   * Define o socket do WhatsApp
   * @param sock Socket do WhatsApp
   */
  public setSocket(sock: WASocket): void {
    this.sock = sock;
  }
  
  /**
   * Adiciona uma mensagem à fila
   * @param jid ID do destinatário
   * @param content Conteúdo da mensagem
   * @param priority Prioridade da mensagem (maior = mais prioritário)
   */
  public async enqueue(jid: string, content: any, priority: number = 0): Promise<void> {
    // Adicionar à fila
    this.queue.push({
      jid,
      content,
      priority
    });
    
    // Ordenar a fila por prioridade (maior primeiro)
    this.queue.sort((a, b) => b.priority - a.priority);
    
    // Iniciar processamento se não estiver em andamento
    if (!this.processing) {
      this.processQueue();
    }
  }
  
  /**
   * Adiciona o horário atual à mensagem para evitar detecção de padrões
   * @param content Conteúdo da mensagem
   * @returns Conteúdo da mensagem com horário
   */
  private addRandomText(content: any): any {
    // Obter o horário atual no formato [HH:MM:SS]
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    const timeMarker = `[${hours}:${minutes}:${seconds}] `;
    
    // Se o conteúdo tiver um campo de texto, adicionar o horário
    if (content && typeof content === 'object') {
      // Para mensagens de texto normais
      if (content.text) {
        content.text = `${timeMarker}${content.text}`;
      }
      
      // Para legendas de imagens, vídeos, etc.
      if (content.caption) {
        content.caption = `${timeMarker}${content.caption}`;
      }
      
      // Para mensagens de botão
      if (content.buttonText) {
        content.buttonText = `${timeMarker}${content.buttonText}`;
      }
      
      // Para listas
      if (content.sections) {
        content.title = content.title ? `${timeMarker}${content.title}` : content.title;
        content.buttonText = content.buttonText ? `${timeMarker}${content.buttonText}` : content.buttonText;
      }
    }
    
    return content;
  }
  
  /**
   * Processa a fila de mensagens
   */
  private async processQueue(): Promise<void> {
    if (!this.sock) {
      logger.error('Socket não disponível para enviar mensagens');
      return;
    }
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      const message = this.queue.shift();
      
      if (!message) continue;
      
      try {
        // Adicionar texto aleatório à mensagem
        const modifiedContent = this.addRandomText(message.content);
        
        // Enviar a mensagem
        await this.sock.sendMessage(message.jid, modifiedContent);
        
        // Aguardar o tempo adequado com base na prioridade
        const delay = message.priority > 0 ? this.priorityDelay : this.minDelay;
        
        // Aguardar antes de enviar a próxima mensagem
        await new Promise(resolve => setTimeout(resolve, delay));
      } catch (error) {
        logger.error(`Erro ao enviar mensagem: ${(error as Error).message}`, error as Error);
      }
    }
    
    this.processing = false;
  }
  
  /**
   * Envia uma mensagem com alta prioridade (resposta a comando)
   * @param jid ID do destinatário
   * @param content Conteúdo da mensagem
   */
  public async sendCommandResponse(jid: string, content: any): Promise<void> {
    return this.enqueue(jid, content, 10); // Prioridade alta para respostas de comandos
  }
  
  /**
   * Envia uma mensagem de status (média prioridade)
   * @param jid ID do destinatário
   * @param content Conteúdo da mensagem
   */
  public async sendStatus(jid: string, content: any): Promise<void> {
    return this.enqueue(jid, content, 5); // Prioridade média para mensagens de status
  }
  
  /**
   * Envia uma mensagem normal (baixa prioridade)
   * @param jid ID do destinatário
   * @param content Conteúdo da mensagem
   */
  public async sendMessage(jid: string, content: any): Promise<void> {
    return this.enqueue(jid, content, 0); // Prioridade baixa para mensagens normais
  }
}

export default new MessageQueue();
