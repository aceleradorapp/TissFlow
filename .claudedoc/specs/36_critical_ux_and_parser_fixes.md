# Especificação Técnica: Correções Críticas de Parsing e Empilhamento de UI

## 1. Objetivo
Corrigir o erro de correspondência de estado ao detectar a versão do XML e consertar o layout de sobreposição das notificações do sistema.

## 2. Motor de Detecção da Versão TISS (`XmlTemplateBuilder.jsx`)
- O estado `versaoTISS` consome o ID numérico do registro do banco de dados.
- Ao extrair a string do XML (ex: `"4.00.00"`), o sistema DEVE buscar na lista de estados de versões carregadas da API (`versionsList`) o objeto cujo campo `name` ou `code` contenha a string detectada.
- O estado do Select deve ser atualizado obrigatoriamente com o `id` encontrado (`setVersaoTiss(versionObject.id)`), garantindo a reatividade visual imediata do dropdown.

## 3. Empilhamento de Notificações (Toasts UI)
- Localizar o componente ou container que renderiza as notificações na tela.
- Garantir que o elemento pai seja um contêiner fixo (`fixed top-5 right-5 z-[9999]`) e que os filhos sejam empilhados verticalmente utilizando as classes do Tailwind: `flex flex-col gap-2 items-end`.