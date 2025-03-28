import { WASocket } from '@whiskeysockets/baileys';
import logger from './logger';

/**
 * Utilitários para criar e enviar mensagens interativas no WhatsApp
 */

/**
 * Interface para botão
 */
export interface Button {
    id: string;
    text: string;
}

/**
 * Interface para item de lista
 */
export interface ListItem {
    title: string;
    description?: string;
    rowId: string;
}

/**
 * Interface para seção de lista
 */
export interface ListSection {
    title: string;
    rows: ListItem[];
}

/**
 * Cria uma mensagem com botões
 * @param text Texto principal da mensagem
 * @param buttons Array de botões
 * @param footer Texto de rodapé (opcional)
 * @returns Objeto de mensagem com botões
 */
export function createButtonMessage(
    text: string,
    buttons: Button[],
    footer?: string
): any {
    const formattedButtons = buttons.map((button, index) => ({
        buttonId: button.id || `btn_${index}`,
        buttonText: { displayText: button.text },
        type: 1
    }));

    return {
        text: text,
        footer: footer || '',
        buttons: formattedButtons,
        headerType: 1
    };
}

/**
 * Cria uma mensagem com botões e imagem
 * @param text Texto/legenda da mensagem
 * @param imageUrl URL da imagem
 * @param buttons Array de botões
 * @param footer Texto de rodapé (opcional)
 * @returns Objeto de mensagem com botões e imagem
 */
export function createImageButtonMessage(
    text: string,
    imageUrl: string,
    buttons: Button[],
    footer?: string
): any {
    const formattedButtons = buttons.map((button, index) => ({
        buttonId: button.id || `btn_${index}`,
        buttonText: { displayText: button.text },
        type: 1
    }));

    return {
        image: { url: imageUrl },
        caption: text,
        footer: footer || '',
        buttons: formattedButtons,
        headerType: 4
    };
}

/**
 * Cria uma mensagem com lista de opções
 * @param text Texto principal da mensagem
 * @param buttonText Texto do botão que abre a lista
 * @param sections Seções da lista
 * @param title Título da lista (opcional)
 * @param footer Texto de rodapé (opcional)
 * @returns Objeto de mensagem com lista
 */
export function createListMessage(
    text: string,
    buttonText: string,
    sections: ListSection[],
    title?: string,
    footer?: string
): any {
    return {
        text: text,
        footer: footer || '',
        title: title || '',
        buttonText: buttonText,
        sections: sections
    };
}

/**
 * Cria uma mensagem de enquete
 * @param question Pergunta da enquete
 * @param options Opções de resposta
 * @param isMultiSelect Permite selecionar múltiplas opções (opcional, padrão: false)
 * @returns Objeto de mensagem de enquete
 */
export function createPollMessage(
    question: string,
    options: string[],
    isMultiSelect: boolean = false
): any {
    return {
        poll: {
            name: question,
            values: options,
            selectableCount: isMultiSelect ? options.length : 1
        }
    };
}

/**
 * Cria uma reação para uma mensagem
 * @param emoji Emoji para a reação
 * @param messageId ID da mensagem para reagir
 * @param remoteJid ID do chat (remetente)
 * @param fromMe Se a mensagem é do bot (opcional, padrão: false)
 * @returns Objeto de reação
 */
export function createReaction(
    emoji: string,
    messageId: string,
    remoteJid: string,
    fromMe: boolean = false
): any {
    return {
        react: {
            text: emoji,
            key: {
                remoteJid: remoteJid,
                id: messageId,
                fromMe: fromMe
            }
        }
    };
}

/**
 * Envia uma mensagem com botões
 * @param sock Socket do WhatsApp
 * @param jid ID do destinatário
 * @param text Texto principal da mensagem
 * @param buttons Array de botões
 * @param footer Texto de rodapé (opcional)
 * @returns Resultado do envio
 */
export async function sendButtons(
    sock: WASocket,
    jid: string,
    text: string,
    buttons: Button[],
    footer?: string
): Promise<any> {
    try {
        const buttonMessage = createButtonMessage(text, buttons, footer);
        return await sock.sendMessage(jid, buttonMessage);
    } catch (error) {
        logger.error(`Erro ao enviar botões: ${(error as Error).message}`, error as Error);
        throw error;
    }
}

/**
 * Envia uma mensagem com botões e imagem
 * @param sock Socket do WhatsApp
 * @param jid ID do destinatário
 * @param text Texto/legenda da mensagem
 * @param imageUrl URL da imagem
 * @param buttons Array de botões
 * @param footer Texto de rodapé (opcional)
 * @returns Resultado do envio
 */
export async function sendImageButtons(
    sock: WASocket,
    jid: string,
    text: string,
    imageUrl: string,
    buttons: Button[],
    footer?: string
): Promise<any> {
    try {
        const buttonMessage = createImageButtonMessage(text, imageUrl, buttons, footer);
        return await sock.sendMessage(jid, buttonMessage);
    } catch (error) {
        logger.error(`Erro ao enviar botões com imagem: ${(error as Error).message}`, error as Error);
        throw error;
    }
}

/**
 * Envia uma mensagem com lista de opções
 * @param sock Socket do WhatsApp
 * @param jid ID do destinatário
 * @param text Texto principal da mensagem
 * @param buttonText Texto do botão que abre a lista
 * @param sections Seções da lista
 * @param title Título da lista (opcional)
 * @param footer Texto de rodapé (opcional)
 * @returns Resultado do envio
 */
export async function sendList(
    sock: WASocket,
    jid: string,
    text: string,
    buttonText: string,
    sections: ListSection[],
    title?: string,
    footer?: string
): Promise<any> {
    try {
        const listMessage = createListMessage(text, buttonText, sections, title, footer);
        return await sock.sendMessage(jid, listMessage);
    } catch (error) {
        logger.error(`Erro ao enviar lista: ${(error as Error).message}`, error as Error);
        throw error;
    }
}

/**
 * Envia uma mensagem de enquete
 * @param sock Socket do WhatsApp
 * @param jid ID do destinatário
 * @param question Pergunta da enquete
 * @param options Opções de resposta
 * @param isMultiSelect Permite selecionar múltiplas opções (opcional, padrão: false)
 * @returns Resultado do envio
 */
export async function sendPoll(
    sock: WASocket,
    jid: string,
    question: string,
    options: string[],
    isMultiSelect: boolean = false
): Promise<any> {
    try {
        const pollMessage = createPollMessage(question, options, isMultiSelect);
        return await sock.sendMessage(jid, pollMessage);
    } catch (error) {
        logger.error(`Erro ao enviar enquete: ${(error as Error).message}`, error as Error);
        throw error;
    }
}

/**
 * Envia uma reação para uma mensagem
 * @param sock Socket do WhatsApp
 * @param jid ID do chat (remetente)
 * @param emoji Emoji para a reação
 * @param messageId ID da mensagem para reagir
 * @param fromMe Se a mensagem é do bot (opcional, padrão: false)
 * @returns Resultado do envio
 */
export async function sendReaction(
    sock: WASocket,
    jid: string,
    emoji: string,
    messageId: string,
    fromMe: boolean = false
): Promise<any> {
    try {
        const reaction = createReaction(emoji, messageId, jid, fromMe);
        return await sock.sendMessage(jid, reaction);
    } catch (error) {
        logger.error(`Erro ao enviar reação: ${(error as Error).message}`, error as Error);
        throw error;
    }
}

/**
 * Cria botões de confirmação (Sim/Não)
 * @param text Texto principal da mensagem
 * @param footer Texto de rodapé (opcional)
 * @returns Objeto de mensagem com botões de confirmação
 */
export function createConfirmButtons(
    text: string,
    footer?: string
): any {
    const buttons: Button[] = [
        { id: 'yes', text: 'Sim' },
        { id: 'no', text: 'Não' }
    ];
    
    return createButtonMessage(text, buttons, footer);
}

/**
 * Envia botões de confirmação (Sim/Não)
 * @param sock Socket do WhatsApp
 * @param jid ID do destinatário
 * @param text Texto principal da mensagem
 * @param footer Texto de rodapé (opcional)
 * @returns Resultado do envio
 */
export async function sendConfirmButtons(
    sock: WASocket,
    jid: string,
    text: string,
    footer?: string
): Promise<any> {
    try {
        const confirmMessage = createConfirmButtons(text, footer);
        return await sock.sendMessage(jid, confirmMessage);
    } catch (error) {
        logger.error(`Erro ao enviar botões de confirmação: ${(error as Error).message}`, error as Error);
        throw error;
    }
}

/**
 * Cria uma lista de opções simples
 * @param text Texto principal da mensagem
 * @param buttonText Texto do botão que abre a lista
 * @param items Array de itens (título e ID)
 * @param title Título da lista (opcional)
 * @param footer Texto de rodapé (opcional)
 * @returns Objeto de mensagem com lista simples
 */
export function createSimpleList(
    text: string,
    buttonText: string,
    items: { title: string; id: string }[],
    title?: string,
    footer?: string
): any {
    const section: ListSection = {
        title: 'Opções',
        rows: items.map(item => ({
            title: item.title,
            rowId: item.id
        }))
    };
    
    return createListMessage(text, buttonText, [section], title, footer);
}

/**
 * Envia uma lista de opções simples
 * @param sock Socket do WhatsApp
 * @param jid ID do destinatário
 * @param text Texto principal da mensagem
 * @param buttonText Texto do botão que abre a lista
 * @param items Array de itens (título e ID)
 * @param title Título da lista (opcional)
 * @param footer Texto de rodapé (opcional)
 * @returns Resultado do envio
 */
export async function sendSimpleList(
    sock: WASocket,
    jid: string,
    text: string,
    buttonText: string,
    items: { title: string; id: string }[],
    title?: string,
    footer?: string
): Promise<any> {
    try {
        const listMessage = createSimpleList(text, buttonText, items, title, footer);
        return await sock.sendMessage(jid, listMessage);
    } catch (error) {
        logger.error(`Erro ao enviar lista simples: ${(error as Error).message}`, error as Error);
        throw error;
    }
}

/**
 * Emojis comuns para reações
 */
export const ReactionEmojis = {
    LIKE: '👍',
    DISLIKE: '👎',
    LOVE: '❤️',
    LAUGH: '😂',
    WOW: '😮',
    SAD: '😢',
    PRAY: '🙏',
    ANGRY: '😡',
    PARTY: '🎉',
    FIRE: '🔥',
    CLAP: '👏',
    OK: '👌',
    THINKING: '🤔',
    CHECK: '✅',
    CROSS: '❌'
};
