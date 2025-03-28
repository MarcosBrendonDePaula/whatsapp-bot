# Sistema de Estados para WhatsApp Bot

O sistema de estados permite que plugins e comandos criem fluxos de conversação baseados em estados, facilitando a criação de interações complexas com os usuários.

## Conceitos Básicos

### Estados

Um estado representa uma etapa específica em um fluxo de conversação. Cada usuário pode estar em um estado específico, que determina como suas mensagens serão processadas.

### Componentes Principais

1. **StateManager**: Gerencia os estados dos usuários, permitindo criar, atualizar e remover estados.
2. **MessageHandler**: Processa mensagens com base no estado atual do usuário.
3. **StateCommandParams**: Interface estendida de CommandParams que inclui funções para manipulação de estados.

## Como Usar o Sistema de Estados

### 1. Criando um Plugin com Estados

Para criar um plugin que utilize estados, você precisa:

1. Registrar comandos normais e manipuladores de estado
2. Implementar a lógica de transição entre estados

Exemplo:

```typescript
protected async onInitialize(): Promise<void> {
    // Registrar comando inicial
    this.registerCommand('meucomando', this.iniciarFluxo.bind(this));
    
    // Registrar manipuladores de estado
    this.registerCommand('state:meuplugin:estado1', this.manipuladorEstado1.bind(this) as Command);
    this.registerCommand('state:meuplugin:estado2', this.manipuladorEstado2.bind(this) as Command);
}
```

### 2. Iniciando um Fluxo de Estado

Para iniciar um fluxo de estado, use o método `createState`:

```typescript
private async iniciarFluxo(params: CommandParams): Promise<void> {
    if ('createState' in params) {
        const stateParams = params as StateCommandParams;
        
        // Criar um novo estado para o usuário
        stateParams.createState('estado1', {
            // Dados adicionais associados ao estado
            dadosIniciais: 'valor'
        });
        
        await params.sock.sendMessage(params.sender, {
            text: 'Fluxo iniciado! Responda com alguma informação:'
        });
    }
}
```

### 3. Manipulando Estados

Cada estado deve ter um manipulador correspondente:

```typescript
private async manipuladorEstado1(params: StateCommandParams): Promise<void> {
    const { sock, sender, messageContent, state, updateState } = params;
    
    // Processar a mensagem do usuário
    
    // Atualizar o estado e avançar para o próximo
    updateState('estado2', {
        ...state?.data,
        resposta1: messageContent
    });
    
    await sock.sendMessage(sender, {
        text: 'Próxima pergunta:'
    });
}
```

### 4. Finalizando um Fluxo de Estado

Para finalizar um fluxo, use o método `clearState`:

```typescript
private async manipuladorEstadoFinal(params: StateCommandParams): Promise<void> {
    const { sock, sender, state } = params;
    
    // Processar os dados finais
    const dadosCompletos = state?.data;
    
    // Limpar o estado
    params.clearState();
    
    await sock.sendMessage(sender, {
        text: 'Fluxo concluído com sucesso!'
    });
}
```

## Convenções de Nomenclatura

- Os nomes dos manipuladores de estado devem seguir o padrão: `state:{plugin}:{estado}`
- Exemplo: `state:form:name`, `state:form:email`, etc.

## Exemplo Completo

Veja o plugin `form` para um exemplo completo de implementação do sistema de estados:

```
src/plugins/form/index.ts
```

Este plugin implementa um formulário interativo que coleta nome, email e idade do usuário, demonstrando como criar um fluxo de conversação baseado em estados.

## Configuração

O sistema de estados pode ser configurado no arquivo `config.ts`:

```typescript
states: {
    // Tempo máximo (em horas) para manter estados inativos
    maxAgeHours: 24,
    // Intervalo (em minutos) para salvar estados automaticamente
    saveInterval: 5
}
```

## Persistência

Os estados são salvos automaticamente em um arquivo JSON e carregados na inicialização do bot, garantindo que os fluxos de conversação não sejam perdidos em caso de reinicialização.
