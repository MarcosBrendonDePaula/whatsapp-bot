# Mensagens Interativas no WhatsApp Bot

Este documento descreve como usar o plugin de mensagens interativas para enviar botões, listas, enquetes e reações no WhatsApp.

## Recursos Disponíveis

O plugin de mensagens interativas oferece os seguintes recursos:

1. **Botões**: Envie mensagens com botões clicáveis
2. **Listas**: Crie menus de seleção com categorias e itens
3. **Enquetes**: Crie enquetes para votação
4. **Reações**: Adicione reações de emoji às mensagens

## Comandos

### Botões

O comando `!botoes` permite enviar uma mensagem com botões clicáveis.

**Uso:**
```
!botoes [texto da mensagem]
```

**Exemplo:**
```
!botoes Escolha uma opção para continuar
```

Isso enviará uma mensagem com o texto fornecido e três botões: "Opção 1", "Opção 2" e "Opção 3".

### Listas

O comando `!lista` permite enviar uma mensagem com uma lista de opções organizadas em categorias.

**Uso:**
```
!lista [título da lista]
```

**Exemplo:**
```
!lista Menu de opções
```

Isso enviará uma mensagem com um botão "Ver opções" que, quando clicado, mostrará uma lista de itens organizados em categorias.

### Enquetes

O comando `!enquete` permite criar uma enquete para votação.

**Uso:**
```
!enquete [pergunta da enquete]
```

**Exemplo:**
```
!enquete Qual sua cor favorita?
```

Isso criará uma enquete com a pergunta fornecida e opções predefinidas (Vermelho, Azul, Verde, Amarelo, Roxo).

### Reações

O comando `!reacao` permite adicionar uma reação de emoji a uma mensagem.

**Uso:**
Responda a uma mensagem com o comando `!reacao`

**Exemplo:**
Responda a uma mensagem e digite `!reacao`

Isso adicionará uma reação de emoji aleatória à mensagem respondida.

## Limitações

É importante notar que nem todos os recursos interativos são suportados em todas as versões do WhatsApp ou em todos os dispositivos. Alguns recursos podem não funcionar em determinadas situações:

1. **Botões e Listas**: Funcionam melhor no WhatsApp para celular. No WhatsApp Web, podem aparecer como mensagens de texto simples.
2. **Enquetes**: Recurso mais recente, pode não funcionar em versões antigas do WhatsApp.
3. **Reações**: Disponíveis na maioria das versões recentes do WhatsApp.

## Personalização

Para personalizar os botões, listas e enquetes, você pode modificar o código-fonte do plugin em `src/plugins/interactive/index.ts` ou usar diretamente as funções utilitárias em `src/utils/interactive-utils.ts`.

### Usando as Funções Utilitárias

O arquivo `interactive-utils.ts` fornece funções para criar e enviar mensagens interativas:

```typescript
// Importar as funções utilitárias
import * as interactiveUtils from '../utils/interactive-utils';

// Criar e enviar botões
const buttons: interactiveUtils.Button[] = [
    { id: 'option1', text: 'Opção 1' },
    { id: 'option2', text: 'Opção 2' }
];
await interactiveUtils.sendButtons(sock, sender, 'Texto da mensagem', buttons, 'Rodapé');

// Criar e enviar lista
const sections: interactiveUtils.ListSection[] = [
    {
        title: "Categoria",
        rows: [
            { title: "Item 1", description: "Descrição", rowId: "item1" }
        ]
    }
];
await interactiveUtils.sendList(sock, sender, 'Texto', 'Botão', sections, 'Título', 'Rodapé');

// Criar e enviar enquete
await interactiveUtils.sendPoll(sock, sender, 'Pergunta', ['Opção 1', 'Opção 2']);

// Enviar reação
await interactiveUtils.sendReaction(sock, sender, '👍', messageId);

// Usar emojis predefinidos
const emoji = interactiveUtils.ReactionEmojis.LIKE; // '👍'
```

### Funções Auxiliares

O utilitário também inclui funções para casos de uso comuns:

```typescript
// Enviar botões de confirmação (Sim/Não)
await interactiveUtils.sendConfirmButtons(sock, sender, 'Confirmar ação?');

// Enviar lista simples
const items = [
    { title: 'Item 1', id: 'id1' },
    { title: 'Item 2', id: 'id2' }
];
await interactiveUtils.sendSimpleList(sock, sender, 'Escolha um item', 'Ver itens', items);
```

### Personalizar o Plugin

Para personalizar o plugin, modifique os arrays no arquivo `src/plugins/interactive/index.ts`:

#### Personalizar Botões

```typescript
const buttons: interactiveUtils.Button[] = [
    { id: 'option1', text: 'Opção 1' },
    { id: 'option2', text: 'Opção 2' },
    { id: 'option3', text: 'Opção 3' }
];
```

#### Personalizar Listas

```typescript
const sections: interactiveUtils.ListSection[] = [
    {
        title: "Categoria 1",
        rows: [
            { title: "Item 1", description: "Descrição do item 1", rowId: "item1" },
            { title: "Item 2", description: "Descrição do item 2", rowId: "item2" }
        ]
    }
];
```

#### Personalizar Enquetes

```typescript
const options = ['Vermelho', 'Azul', 'Verde', 'Amarelo', 'Roxo'];
```

## Tratamento de Respostas

Atualmente, o plugin não inclui tratamento para as respostas dos usuários aos elementos interativos. Para implementar isso, você precisaria:

1. Modificar o `MessageHandler` para detectar respostas a botões, listas e enquetes
2. Adicionar lógica para processar essas respostas

Isso pode ser implementado em uma versão futura do plugin.

## Exemplos Avançados

### Botões com Imagem

Para enviar botões com uma imagem, você pode modificar o método `buttonCommand`:

```typescript
const buttonMessage = {
    image: { url: 'https://example.com/image.jpg' },
    caption: text,
    footer: 'Escolha uma das opções acima',
    buttons: buttons,
    headerType: 4
};
```

### Lista com Imagem

Para enviar uma lista com uma imagem, você pode modificar o método `listCommand`:

```typescript
const listMessage = {
    text: "Selecione uma opção da lista",
    footer: "Escolha sabiamente",
    title: title,
    buttonText: "Ver opções",
    sections: sections,
    listType: 2,
    thumbnailUrl: 'https://example.com/thumbnail.jpg'
};
```

## Solução de Problemas

Se você encontrar problemas ao usar os recursos interativos:

1. **Verifique a versão do WhatsApp**: Certifique-se de que está usando uma versão recente do WhatsApp.
2. **Verifique os logs**: Os logs do bot podem fornecer informações sobre erros.
3. **Limitações da API**: Alguns recursos podem ser limitados pela API do WhatsApp.
