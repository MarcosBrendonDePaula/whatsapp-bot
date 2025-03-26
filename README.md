# WhatsApp Bot

Bot de WhatsApp não oficial usando TypeScript com sistema modular de plugins.

## Características

- Sistema de logging com rotação de arquivos
- Arquitetura modular baseada em plugins
- Fácil criação de novos comandos
- Gerenciamento automático de sessão

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

## Estrutura do Projeto

```
whatsapp-bot/
├── src/
│   ├── commands/       # Comandos básicos
│   ├── core/           # Núcleo do bot
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
