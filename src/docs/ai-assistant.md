# Assistente de IA para WhatsApp Bot

Este documento descreve como usar o plugin de Assistente de IA, que permite integrar modelos de linguagem da OpenAI ao seu WhatsApp Bot.

## Visão Geral

O plugin de Assistente de IA permite que você tenha conversas naturais com modelos de linguagem como GPT-3.5 e GPT-4 diretamente no WhatsApp. Cada chat ou grupo pode ter sua própria configuração, incluindo:

- Chave de API do OpenAI específica
- Modelo de linguagem preferido
- Nome personalizado para o bot
- Configurações de resposta automática

## Configuração

### Requisitos

Para usar o Assistente de IA, você precisa:

1. Uma chave de API da OpenAI (começa com `sk-`)
2. Conexão com a internet para acessar a API da OpenAI

### Comandos Básicos

O plugin oferece vários comandos para configurar e controlar o assistente:

- `!ai on` - Ativa o assistente de IA para o chat atual
- `!ai off` - Desativa o assistente de IA
- `!ai status` - Mostra o status atual da configuração
- `!ai apikey [chave]` - Define a chave de API do OpenAI
- `!ai model [modelo]` - Define o modelo a ser usado (ex: gpt-3.5-turbo, gpt-4)
- `!ai name [nome]` - Define o nome do bot
- `!ai mention [on/off]` - Define se o bot responde apenas quando mencionado
- `!ai clear` - Limpa o histórico de conversa
- `!ai config` - Inicia o assistente de configuração interativo
- `!ai models` - Lista os modelos disponíveis
- `!ai prompt [texto]` - Define o prompt do sistema (apenas em conversas privadas)

### Configuração Passo a Passo

Para configurar o assistente de IA em um novo chat:

1. **Defina a chave de API**: `!ai apikey sk-sua-chave-aqui`
2. **Ative o assistente**: `!ai on`
3. **Escolha um modelo**: `!ai model gpt-3.5-turbo`
4. **Defina um nome para o bot**: `!ai name Assistente`
5. **Configure o modo de menção**: `!ai mention on` (responde apenas quando mencionado)

Alternativamente, use `!ai config` para um assistente de configuração interativo.

## Uso

### Interagindo com o Assistente

Depois de configurado, você pode interagir com o assistente de duas maneiras:

1. **Menção direta**: Se o modo de menção estiver ativado, inclua o nome do bot na mensagem:
   ```
   Olá Assistente, você pode me ajudar com uma receita de bolo?
   ```

2. **Conversa natural**: Se o modo de menção estiver desativado, o bot responderá a todas as mensagens que não sejam comandos.

### Histórico de Conversa

O assistente mantém um histórico das últimas mensagens para fornecer respostas contextuais. Você pode:

- Ver o histórico atual no arquivo JSON em `.data/ai-history/`
- Limpar o histórico com `!ai clear`

### Personalização do Prompt do Sistema

O prompt do sistema define a personalidade e comportamento do assistente. Para personalizá-lo:

```
!ai prompt Você é um assistente especializado em programação. Forneça respostas técnicas e detalhadas sobre código.
```

**Nota**: Este comando só está disponível em conversas privadas por motivos de segurança.

## Configuração por Chat

Cada chat ou grupo pode ter sua própria configuração independente. Isso permite:

- Diferentes chaves de API para diferentes grupos
- Modelos específicos para cada conversa
- Personalidades distintas do bot em diferentes contextos

## Modelos Disponíveis

Os seguintes modelos estão disponíveis:

- `gpt-3.5-turbo` - Modelo padrão, bom equilíbrio entre desempenho e custo
- `gpt-3.5-turbo-16k` - Versão com contexto maior
- `gpt-4` - Modelo mais avançado, melhor raciocínio
- `gpt-4-turbo` - Versão mais rápida do GPT-4
- `gpt-4o` - Modelo mais recente e avançado
- `gpt-4o-mini` - Versão mais leve do GPT-4o

Use `!ai models` para ver a lista completa.

## Considerações de Uso

### Privacidade

- As mensagens são enviadas para a API da OpenAI
- Considere a privacidade ao usar em grupos
- Não compartilhe informações sensíveis nas conversas

### Custos

- A API da OpenAI é um serviço pago
- Diferentes modelos têm custos diferentes
- Monitore seu uso para evitar cobranças inesperadas

### Limitações

- Respostas dependem da qualidade da API
- O contexto é limitado às últimas mensagens
- O bot não tem acesso à internet para buscar informações em tempo real

## Solução de Problemas

### O bot não responde

- Verifique se o assistente está ativado: `!ai status`
- Confirme se a chave de API é válida
- Se o modo de menção estiver ativado, certifique-se de incluir o nome do bot

### Erros de API

- "Rate limit exceeded": Muitas solicitações em pouco tempo, aguarde um momento
- "Invalid API key": Verifique se a chave foi inserida corretamente
- "Model overloaded": O modelo está sobrecarregado, tente novamente mais tarde

### Respostas Inadequadas

- Limpe o histórico: `!ai clear`
- Ajuste o prompt do sistema: `!ai prompt [novo_prompt]`
- Experimente um modelo diferente: `!ai model [outro_modelo]`

## Exemplos de Uso

### Configuração Básica

```
!ai apikey sk-sua-chave-aqui
!ai on
!ai name Assistente
```

### Configuração Avançada

```
!ai model gpt-4
!ai mention off
!ai prompt Você é um assistente especializado em marketing digital. Forneça respostas criativas e estratégicas.
```

### Interação

```
Usuário: Assistente, você pode me ajudar a escrever um e-mail profissional?
Bot: Claro! Para escrever um e-mail profissional, é importante considerar...
