import { proto, WASocket } from '@whiskeysockets/baileys';
import { BasePlugin } from '../base-plugin';
import { CommandParams } from '../../types';
import logger from '../../utils/logger';
import * as interactiveUtils from '../../utils/interactive-utils';

/**
 * Plugin para enviar mensagens interativas como botões, listas e enquetes
 */
export default class InteractivePlugin extends BasePlugin {
    constructor() {
        super(
            'interactive',
            'Plugin para enviar mensagens interativas (botões, listas, enquetes)',
            '1.0.0'
        );
    }
    
    /**
     * Método chamado quando o plugin é inicializado
     */
    protected async onInitialize(): Promise<void> {
        // Registrar comandos
        this.registerCommand('botoes', this.buttonCommand.bind(this));
        this.registerCommand('lista', this.listCommand.bind(this));
        this.registerCommand('enquete', this.pollCommand.bind(this));
        this.registerCommand('reacao', this.reactionCommand.bind(this));
        
        logger.info('Plugin de mensagens interativas inicializado com sucesso');
    }
    
    /**
     * Comando para enviar uma mensagem com botões
     */
    private async buttonCommand(params: CommandParams): Promise<void> {
        const { sock, sender, args } = params;
        
        if (args.length < 1) {
            await sock.sendMessage(sender, {
                text: 'Por favor, forneça um texto para a mensagem com botões.\n\nExemplo: !botoes Escolha uma opção'
            });
            return;
        }
        
        const text = args.join(' ');
        
        try {
            // Definir botões
            const buttons: interactiveUtils.Button[] = [
                { id: 'option1', text: 'Opção 1' },
                { id: 'option2', text: 'Opção 2' },
                { id: 'option3', text: 'Opção 3' }
            ];
            
            // Enviar mensagem com botões usando a função utilitária
            await interactiveUtils.sendButtons(
                sock,
                sender,
                text,
                buttons,
                'Escolha uma das opções acima'
            );
            
            logger.debug(`Mensagem com botões enviada para ${sender}`);
        } catch (error) {
            logger.error(`Erro ao enviar mensagem com botões: ${(error as Error).message}`, error as Error);
            
            await sock.sendMessage(sender, {
                text: `Erro ao enviar mensagem com botões: ${(error as Error).message}`
            });
        }
    }
    
    /**
     * Comando para enviar uma mensagem com lista de opções
     */
    private async listCommand(params: CommandParams): Promise<void> {
        const { sock, sender, args } = params;
        
        if (args.length < 1) {
            await sock.sendMessage(sender, {
                text: 'Por favor, forneça um título para a lista.\n\nExemplo: !lista Menu de opções'
            });
            return;
        }
        
        const title = args.join(' ');
        
        try {
            // Criar seções da lista
            const sections: interactiveUtils.ListSection[] = [
                {
                    title: "Categoria 1",
                    rows: [
                        { title: "Item 1", description: "Descrição do item 1", rowId: "item1" },
                        { title: "Item 2", description: "Descrição do item 2", rowId: "item2" }
                    ]
                },
                {
                    title: "Categoria 2",
                    rows: [
                        { title: "Item 3", description: "Descrição do item 3", rowId: "item3" },
                        { title: "Item 4", description: "Descrição do item 4", rowId: "item4" }
                    ]
                }
            ];
            
            // Enviar mensagem com lista usando a função utilitária
            await interactiveUtils.sendList(
                sock,
                sender,
                "Selecione uma opção da lista",
                "Ver opções",
                sections,
                title,
                "Escolha sabiamente"
            );
            
            logger.debug(`Mensagem com lista enviada para ${sender}`);
        } catch (error) {
            logger.error(`Erro ao enviar mensagem com lista: ${(error as Error).message}`, error as Error);
            
            await sock.sendMessage(sender, {
                text: `Erro ao enviar mensagem com lista: ${(error as Error).message}`
            });
        }
    }
    
    /**
     * Comando para enviar uma enquete
     */
    private async pollCommand(params: CommandParams): Promise<void> {
        const { sock, sender, args } = params;
        
        if (args.length < 1) {
            await sock.sendMessage(sender, {
                text: 'Por favor, forneça uma pergunta para a enquete.\n\nExemplo: !enquete Qual sua cor favorita?'
            });
            return;
        }
        
        const question = args.join(' ');
        
        try {
            // Definir opções da enquete
            const options = ['Vermelho', 'Azul', 'Verde', 'Amarelo', 'Roxo'];
            
            // Enviar enquete usando a função utilitária
            await interactiveUtils.sendPoll(
                sock,
                sender,
                question,
                options
            );
            
            logger.debug(`Enquete enviada para ${sender}`);
        } catch (error) {
            logger.error(`Erro ao enviar enquete: ${(error as Error).message}`, error as Error);
            
            await sock.sendMessage(sender, {
                text: `Erro ao enviar enquete: ${(error as Error).message}`
            });
        }
    }
    
    /**
     * Comando para reagir a uma mensagem
     */
    private async reactionCommand(params: CommandParams): Promise<void> {
        const { sock, sender, msg } = params;
        
        try {
            // Verificar se a mensagem tem um contexto (está respondendo a outra mensagem)
            const quotedMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            
            if (!quotedMessage) {
                await sock.sendMessage(sender, {
                    text: 'Por favor, responda a uma mensagem para adicionar uma reação.\n\nExemplo: Responda a uma mensagem com !reacao'
                });
                return;
            }
            
            // Obter o ID da mensagem citada
            const quotedMessageId = msg.message?.extendedTextMessage?.contextInfo?.stanzaId;
            
            if (!quotedMessageId) {
                await sock.sendMessage(sender, {
                    text: 'Não foi possível identificar a mensagem para reagir.'
                });
                return;
            }
            
            // Escolher um emoji aleatório dos emojis predefinidos
            const emojis = Object.values(interactiveUtils.ReactionEmojis);
            const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
            
            // Enviar reação usando a função utilitária
            await interactiveUtils.sendReaction(
                sock,
                sender,
                randomEmoji,
                quotedMessageId
            );
            
            logger.debug(`Reação enviada para mensagem ${quotedMessageId}`);
        } catch (error) {
            logger.error(`Erro ao enviar reação: ${(error as Error).message}`, error as Error);
            
            await sock.sendMessage(sender, {
                text: `Erro ao enviar reação: ${(error as Error).message}`
            });
        }
    }
    
    /**
     * Método chamado quando o bot é desligado
     */
    public async onShutdown(): Promise<void> {
        logger.info('Plugin de mensagens interativas está sendo desligado');
        await super.onShutdown();
    }
}
