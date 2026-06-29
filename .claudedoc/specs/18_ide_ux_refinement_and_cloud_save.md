# Especificação Técnica: Ordenação de Epílogo, Visibilidade Opcional e Modal de Salvamento

## 1. Objetivo
Fixar a ordenação do bloco epílogo ao final da árvore visual, tratar a visibilidade condicional de subelementos opcionais desativados, corrigir contraste de labels inativos e implementar o modal estruturado para salvar arquivos na nuvem com metadados do usuário.

## 2. Ajustes Visuais e de Layout (Frontend)

### 2.1. Ordenação Estrita da Árvore (`TissIde.jsx`)
- Forçar no mapeamento de renderização que o componente do bloco `<ans:epilogo>` seja renderizado de forma isolada na base final da lista do formulário, independentemente da ordem em que os nós de escolha paralelos cheguem do backend.

### 2.2. Visibilidade Condicional e Contraste de Opcionais (`TreeNode.jsx`)
- Se uma tag for opcional e o seu respectivo checkbox estiver desmarcado (`active = false`), forçar o colapso automático e ocultação de todos os seus elementos filhos, limpando o ruído visual da árvore.
- Alterar a classe do texto de labels de tags opcionais inativas de cinza escuro para `text-slate-400 font-medium dark:text-slate-400` para garantir contraste de leitura.

## 3. Fluxo de Persistência na Nuvem

### 3.1. Modal de Commit (`SaveDocumentModal.jsx`)
- Interceptar o evento do botão "Salvar na Nuvem" e abrir um modal contendo:
  * Input Text: `filename` (Obrigatório, com placeholder indicando o nome do arquivo atual).
  * Textarea: `description` (Opcional, para histórico de alterações).
- O payload enviado para o endpoint `POST /api/tools/ide/save` deve conter: `{ filename, description, raw_xml, version, transaction_type, error_count }`. O backend se encarregará de gerar o timestamp `created_at` automaticamente.