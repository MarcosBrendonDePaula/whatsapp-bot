# WhatsApp Bot

Bot de WhatsApp não oficial usando TypeScript com sistema modular de plugins e gerenciamento de estados.

## Características

- Sistema de logging com rotação de arquivos
- Arquitetura modular baseada em plugins
- Fácil criação de novos comandos
- Gerenciamento automático de sessão
- Sistema de estados para fluxos de conversação
- Mensagens interativas (botões, listas, enquetes e reações)

## Requisitos

- Node.js 14+
- npm ou yarn

## Instalação

1. Clone o repositório
2. Instale as dependências:

```bash
npm install
```

3. Configure o bot editando o arquivo `src/config.ts`
4. Compile o projeto:

```bash
npm run build
```

5. Inicie o bot:

```bash
npm start
```

## Configuração

Edite o arquivo `src/config.ts` para configurar o bot:

```typescript
const config: Config = {
    // Configurações gerais do bot
    sessionPath: './.data/session',  // Diretório para armazenar a sessão
    prefix: '!',                     // Prefixo para comandos
    ownerNumber: '5567998808948',    // Seu número de WhatsApp
    botName: 'MarcosTools',          // Nome do bot
    
    // Configurações de logging
    logging: {
        dir: './logs',               // Diretório para logs
        level: 'info',               // Nível de log (error, warn, info, debug, trace)
        rotation: {
            maxSize: '10m',          // Tamanho máximo do arquivo de log
            maxFiles: 7,             // Número máximo de arquivos a manter
            datePattern: 'YYYY-MM-DD', // Formato da data no nome do arquivo
        },
        console: true                // Mostrar logs no console
    },
    
    // Configurações de plugins
    plugins: {
        dir: path.join(__dirname, 'plugins'), // Diretório de plugins
        enabled: [],                 // Plugins habilitados (vazio = todos)
        disabled: []                 // Plugins desabilitados
    },
    
    // Configurações do sistema de estados
    states: {
        maxAgeHours: 24,            // Tempo máximo para manter estados inativos
        saveInterval: 5              // Intervalo (em minutos) para salvar estados
    }
};
```

## Criando Plugins

Os plugins são a forma recomendada de estender o bot. Para criar um novo plugin:

1. Crie um novo diretório em `src/plugins/` com o nome do seu plugin
2. Crie um arquivo `index.ts` dentro desse diretório
3. Implemente seu plugin estendendo a classe `BasePlugin`

Exemplo de plugin:

```typescript
import { BasePlugin } from '../base-plugin';
import { CommandParams } from '../../types';
import logger from '../../utils/logger';

export default class MeuPlugin extends BasePlugin {
  constructor() {
    super(
      'meu-plugin',                // Nome do plugin
      'Descrição do meu plugin',   // Descrição
      '1.0.0'                      // Versão
    );
  }
  
  protected async onInitialize(): Promise<void> {
    // Registrar comandos
    this.registerCommand('meucomando', this.meuComando.bind(this));
    
    logger.info('Meu plugin inicializado');
  }
  
  private async meuComando(params: CommandParams): Promise<void> {
    const { sock, sender } = params;
    
    await sock.sendMessage(sender, {
      text: 'Este é meu comando personalizado!'
    });
  }
}
```

## Comandos Básicos

O bot vem com alguns comandos básicos:

- `!ajuda` - Mostra a lista de comandos disponíveis
- `!ping` - Verifica se o bot está online
- `!exemplo` - Comando de exemplo do plugin de demonstração
- `!eco [mensagem]` - Repete a mensagem enviada

## Sistema de Estados

O bot inclui um sistema de estados que permite criar fluxos de conversação interativos. Com ele, você pode:

- Criar formulários interativos
- Implementar assistentes conversacionais
- Desenvolver jogos baseados em texto
- Criar fluxos de decisão complexos

### Exemplo de Uso do Sistema de Estados

```typescript
import { Command, CommandParams, StateCommandParams } from '../../types';
import { BasePlugin } from '../base-plugin';

export default class MeuPluginComEstado extends BasePlugin {
  constructor() {
    super('meu-plugin', 'Plugin com estados', '1.0.0');
  }
  
  protected async onInitialize(): Promise<void> {
    // Comando para iniciar o fluxo
    this.registerCommand('iniciar', this.iniciarFluxo.bind(this));
    
    // Manipuladores de estado
    this.registerCommand('state:meu-plugin:pergunta1', this.pergunta1Handler.bind(this) as Command);
    this.registerCommand('state:meu-plugin:pergunta2', this.pergunta2Handler.bind(this) as Command);
  }
  
  private async iniciarFluxo(params: CommandParams): Promise<void> {
    if ('createState' in params) {
      const stateParams = params as StateCommandParams;
      
      // Criar estado inicial
      stateParams.createState('pergunta1', { dados: {} });
      
      await params.sock.sendMessage(params.sender, {
        text: 'Fluxo iniciado! Responda a primeira pergunta:'
      });
    }
  }
  
  private async pergunta1Handler(params: StateCommandParams): Promise<void> {
    // Processar resposta e avançar para próximo estado
    params.updateState('pergunta2', {
      ...params.state?.data,
      resposta1: params.messageContent
    });
    
    await params.sock.sendMessage(params.sender, {
      text: 'Obrigado! Agora responda a segunda pergunta:'
    });
  }
  
  private async pergunta2Handler(params: StateCommandParams): Promise<void> {
    // Processar resposta final
    const dadosCompletos = {
      ...params.state?.data,
      resposta2: params.messageContent
    };
    
    // Limpar o estado
    params.clearState();
    
    await params.sock.sendMessage(params.sender, {
      text: `Fluxo concluído! Suas respostas: ${JSON.stringify(dadosCompletos)}`
    });
  }
}
```

Para mais detalhes sobre o sistema de estados, consulte a documentação em `src/docs/state-system.md`.

## Mensagens Interativas

O bot inclui um plugin para enviar mensagens interativas no WhatsApp, como:

- **Botões**: Mensagens com botões clicáveis
- **Listas**: Menus de seleção com categorias e itens
- **Enquetes**: Votações com múltiplas opções
- **Reações**: Reações de emoji em mensagens

### Comandos Disponíveis

- `!botoes [texto]` - Envia uma mensagem com botões
- `!lista [título]` - Envia uma mensagem com lista de opções
- `!enquete [pergunta]` - Cria uma enquete para votação
- `!reacao` - Adiciona uma reação a uma mensagem (use respondendo a uma mensagem)

### Exemplo de Uso

```
!botoes Escolha uma opção para continuar
!lista Menu principal
!enquete Qual sua cor favorita?
```

Para mais detalhes sobre as mensagens interativas, consulte a documentação em `src/docs/interactive-messages.md`.

## Estrutura do Projeto

```
whatsapp-bot/
├── src/
│   ├── commands/       # Comandos básicos
│   ├── core/           # Núcleo do bot
│   │   ├── connection.ts     # Gerenciamento de conexão
│   │   ├── message-handler.ts # Processamento de mensagens
│   │   └── state-manager.ts  # Gerenciamento de estados
│   ├── docs/           # Documentação
│   ├── plugins/        # Sistema de plugins
│   ├── types/          # Definições de tipos
│   ├── utils/          # Utilitários
│   ├── config.ts       # Configurações
│   └── index.ts        # Ponto de entrada
├── logs/               # Logs do sistema (criado automaticamente)
└── .data/              # Dados de sessão (criado automaticamente)
```

## Licença

ISC
