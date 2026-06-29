# Especificação de Refinamento de UI: Correção de Contraste Global no Visualizador de Código

## 1. Objetivo
Garantir legibilidade 100% clara no modal de código do Gerador TISS, corrigindo cores de fontes residuais escuras que somem no fundo escuro e definindo uma paleta estável de alto contraste independente de seleção de texto.

## 2. Ajustes Visuais (Frontend)

### 2.1. Escopo do Bloco de Código (`CodeModal.jsx` / `CodeViewer.jsx`)
- **Cor Base Global:** Aplicar uma cor de texto clara padrão (ex: `text-slate-200` ou `text-white`) no elemento pai que envelopa o código (`<pre>` ou `<code>`), garantindo que qualquer caractere, tag de fechamento (`</...>`) ou pontuação não mapeada herde essa visibilidade por padrão.
- **Tokens de Sintaxe Específicos:**
  - Garantir que as tags XML (`ans:...`) usem tons claros e vibrantes como `text-cyan-400` ou `text-pink-400`.
  - Assegurar que valores internos e conteúdos gerados usem `text-emerald-400` ou `text-white`.