import { proto } from '@whiskeysockets/baileys';
import { BasePlugin } from '../base-plugin';
import { Command, CommandParams, StateCommandParams } from '../../types';
import logger from '../../utils/logger';

/**
 * Plugin de formulário para demonstrar o uso do sistema de estados
 * Permite criar formulários interativos para coletar informações dos usuários
 */
export default class FormPlugin extends BasePlugin {
    constructor() {
        super(
            'form', // Nome do plugin
            'Plugin de formulário para coleta de informações', // Descrição
            '1.0.0' // Versão
        );
    }
    
    /**
     * Método chamado quando o plugin é inicializado
     */
    protected async onInitialize(): Promise<void> {
        // Registrar comandos
        this.registerCommand('form', this.startFormCommand.bind(this));
        
        // Registrar manipuladores de estado
        // Usamos type assertion para garantir compatibilidade com a interface Command
        this.registerCommand('state:form:name', this.nameStateHandler.bind(this) as Command);
        this.registerCommand('state:form:email', this.emailStateHandler.bind(this) as Command);
        this.registerCommand('state:form:age', this.ageStateHandler.bind(this) as Command);
        this.registerCommand('state:form:confirm', this.confirmStateHandler.bind(this) as Command);
        
        logger.info('Plugin de formulário inicializado com sucesso');
    }
    
    /**
     * Comando para iniciar um novo formulário
     */
    private async startFormCommand(params: CommandParams): Promise<void> {
        const { sock, sender, args } = params;
        
        // Verificar se o comando tem parâmetros estendidos para estados
        if ('createState' in params) {
            const stateParams = params as StateCommandParams;
            
            // Criar um novo estado para o usuário
            stateParams.createState('name', {
                formType: args[0] || 'default',
                data: {}
            });
            
            await sock.sendMessage(sender, {
                text: 'Vamos preencher um formulário! Por favor, digite seu nome:'
            });
        } else {
            // Caso o sistema de estados não esteja funcionando
            await sock.sendMessage(sender, {
                text: 'Erro: Sistema de estados não disponível.'
            });
        }
    }
    
    /**
     * Manipulador para o estado de coleta de nome
     */
    private async nameStateHandler(params: StateCommandParams): Promise<void> {
        const { sock, sender, messageContent, state, updateState } = params;
        
        // Ignorar comandos durante o estado
        if (messageContent.startsWith('!')) {
            await sock.sendMessage(sender, {
                text: 'Você está no meio de um formulário. Digite seu nome ou use !cancelar para sair.'
            });
            return;
        }
        
        // Verificar se o usuário quer cancelar
        if (messageContent.toLowerCase() === 'cancelar' || messageContent.toLowerCase() === '!cancelar') {
            params.clearState();
            await sock.sendMessage(sender, {
                text: 'Formulário cancelado.'
            });
            return;
        }
        
        // Validar o nome (pelo menos 3 caracteres)
        if (messageContent.length < 3) {
            await sock.sendMessage(sender, {
                text: 'Por favor, digite um nome válido (pelo menos 3 caracteres):'
            });
            return;
        }
        
        // Salvar o nome e avançar para o próximo estado
        updateState('email', {
            ...state?.data,
            name: messageContent
        });
        
        await sock.sendMessage(sender, {
            text: `Obrigado, ${messageContent}! Agora, por favor, digite seu email:`
        });
    }
    
    /**
     * Manipulador para o estado de coleta de email
     */
    private async emailStateHandler(params: StateCommandParams): Promise<void> {
        const { sock, sender, messageContent, state, updateState } = params;
        
        // Ignorar comandos durante o estado
        if (messageContent.startsWith('!')) {
            await sock.sendMessage(sender, {
                text: 'Você está no meio de um formulário. Digite seu email ou use !cancelar para sair.'
            });
            return;
        }
        
        // Verificar se o usuário quer cancelar
        if (messageContent.toLowerCase() === 'cancelar' || messageContent.toLowerCase() === '!cancelar') {
            params.clearState();
            await sock.sendMessage(sender, {
                text: 'Formulário cancelado.'
            });
            return;
        }
        
        // Validar o email (verificação simples)
        if (!messageContent.includes('@') || !messageContent.includes('.')) {
            await sock.sendMessage(sender, {
                text: 'Por favor, digite um email válido:'
            });
            return;
        }
        
        // Salvar o email e avançar para o próximo estado
        updateState('age', {
            ...state?.data,
            email: messageContent
        });
        
        await sock.sendMessage(sender, {
            text: 'Ótimo! Agora, por favor, digite sua idade:'
        });
    }
    
    /**
     * Manipulador para o estado de coleta de idade
     */
    private async ageStateHandler(params: StateCommandParams): Promise<void> {
        const { sock, sender, messageContent, state, updateState } = params;
        
        // Ignorar comandos durante o estado
        if (messageContent.startsWith('!')) {
            await sock.sendMessage(sender, {
                text: 'Você está no meio de um formulário. Digite sua idade ou use !cancelar para sair.'
            });
            return;
        }
        
        // Verificar se o usuário quer cancelar
        if (messageContent.toLowerCase() === 'cancelar' || messageContent.toLowerCase() === '!cancelar') {
            params.clearState();
            await sock.sendMessage(sender, {
                text: 'Formulário cancelado.'
            });
            return;
        }
        
        // Validar a idade (número entre 1 e 120)
        const age = parseInt(messageContent, 10);
        if (isNaN(age) || age < 1 || age > 120) {
            await sock.sendMessage(sender, {
                text: 'Por favor, digite uma idade válida (entre 1 e 120):'
            });
            return;
        }
        
        // Salvar a idade e avançar para o estado de confirmação
        updateState('confirm', {
            ...state?.data,
            age: age
        });
        
        // Mostrar resumo para confirmação
        const formData = state?.data;
        await sock.sendMessage(sender, {
            text: `Por favor, confirme seus dados:\n\nNome: ${formData?.name}\nEmail: ${formData?.email}\nIdade: ${age}\n\nDigite "confirmar" para salvar ou "cancelar" para desistir.`
        });
    }
    
    /**
     * Manipulador para o estado de confirmação
     */
    private async confirmStateHandler(params: StateCommandParams): Promise<void> {
        const { sock, sender, messageContent, state } = params;
        
        // Ignorar comandos durante o estado
        if (messageContent.startsWith('!') && !messageContent.toLowerCase().startsWith('!cancelar')) {
            await sock.sendMessage(sender, {
                text: 'Você está no meio de um formulário. Digite "confirmar" ou "cancelar".'
            });
            return;
        }
        
        // Verificar a resposta do usuário
        const response = messageContent.toLowerCase();
        
        if (response === 'confirmar' || response === 'sim' || response === 'ok') {
            // Processar os dados do formulário
            const formData = state?.data;
            
            // Aqui você poderia salvar os dados em um banco de dados, enviar para uma API, etc.
            logger.info(`Formulário completo para ${sender}: ${JSON.stringify(formData)}`);
            
            // Limpar o estado
            params.clearState();
            
            await sock.sendMessage(sender, {
                text: 'Formulário enviado com sucesso! Obrigado por participar.'
            });
        } else if (response === 'cancelar' || response === 'não' || response === 'nao' || response === '!cancelar') {
            // Cancelar o formulário
            params.clearState();
            
            await sock.sendMessage(sender, {
                text: 'Formulário cancelado.'
            });
        } else {
            // Resposta inválida
            await sock.sendMessage(sender, {
                text: 'Por favor, digite "confirmar" para salvar seus dados ou "cancelar" para desistir.'
            });
        }
    }
    
    /**
     * Método chamado quando o bot é desligado
     */
    public async onShutdown(): Promise<void> {
        logger.info('Plugin de formulário está sendo desligado');
        await super.onShutdown();
    }
}
