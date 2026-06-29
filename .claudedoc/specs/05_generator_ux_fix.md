# Especificação de Refinamento de UX: Alinhamento, Contraste e Comportamento do Gerador

## 1. Objetivo
Corrigir os problemas críticos de usabilidade e contraste do Gerador de Amostras, movendo os seletores para a esquerda, forçando o estado inicial como totalmente marcado e aplicando um tema de alto contraste para o visualizador de código.

## 2. Ajustes Visuais e Funcionais (Frontend)

### 2.1. Posicionamento e Comportamento da Árvore (`GeneratorTree.jsx` / `TreeNode.jsx`)
- **Checkboxes à Esquerda:** Mover o checkbox de inclusão para antes do ícone de pasta/folha e do nome do campo. Alinhamento: `flex items-center gap-2`.
- **Estado Inicial Ativo:** Ao montar a árvore de um tipo de transação, inicializar o estado de todos os campos opcionais como selecionados (`true`).
- **Hierarquia Enxuta:** Garantir que o parser da árvore exiba estritamente os nós válidos para a transação, removendo nós fantasmas ou duplicados.

### 2.2. Alto Contraste no Modal de Código (`CodeModal.jsx` / `CodeViewer.jsx`)
- **Acessibilidade de Cores:** Substituir as cores escuras das tags XML por um esquema de alto contraste:
  * Símbolos `<` e `>` e nomes de tags: `text-[#ff79c6]` (Rosa Dracula) ou `text-cyan-400`.
  * Conteúdo/Valores das tags: `text-white font-medium`.
  * Namespaces e atributos: `text-[#50fa7b]` (Verde) ou `text-amber-300`.
- **Code Folding:** Manter os seletores de fechar/abrir blocos perfeitamente visíveis e clicáveis com cores claras.