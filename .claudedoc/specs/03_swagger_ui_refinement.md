# Especificação de Refinamento de UI/UX: Painel de Inspeção e Árvore TISS

## 1. Objetivo
Melhorar a legibilidade da árvore de elementos e transformar o painel de inspeção lateral direito em uma interface profissional de alto impacto, destacando tipos de dados, restrições e regras de obrigatoriedade de forma clara e limpa.

## 2. Alterações no Frontend

### 2.1. Árvore Central (`TreeNode.jsx`)
- Alterar o tamanho da fonte dos nomes das tags de `text-sm` para `text-[15px]` ou `text-base` e aplicar `font-medium` para melhorar o contraste contra o fundo escuro.
- Garantir que o espaçamento (`padding` e `gap`) acompanhe o tamanho sem encavalar os ícones de pastas.

### 2.2. Painel Lateral Direito (`InspectionPanel.jsx` ou equivalente)
- **Cabeçalho:** O nome da tag selecionada deve usar `text-xl font-bold tracking-tight text-white`.
- **Badges de Status (Obrigatoriedade):**
  - Se for Obrigatório (`minOccurs >= 1`): Badge estilizada com classes Tailwind `bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 text-xs font-semibold rounded-md uppercase tracking-wider`.
  - Se for Opcional (`minOccurs == 0`): Badge estilizada com classes `bg-slate-800 text-slate-400 border border-slate-700 px-2.5 py-1 text-xs font-semibold rounded-md uppercase tracking-wider`.
- **Grid de Propriedades Técnicas (Novo Layout):**
  - Criar um layout em duas colunas (`grid grid-cols-2 gap-3 mb-6`) para exibir metadados rápidos:
    * **Card Tipo de Dado:** Mostra o tipo primitivo (Ex: `Texto (string)`, `Data (date)`, `Inteiro (integer)`, `Estrutura (complex)`) com um ícone de chave ou terminal.
    * **Card Ocorrências:** Exibe o range (Ex: `Mín: 0 / Máx: 1` ou `Mín: 1 / Máx: Unbounded`) de forma limpa.
- **Seção de Restrições Estruturadas:**
  - Se houver restrições como `minLength`, `maxLength` ou `pattern_regex`, renderizar uma mini tabela ou lista em cards com fundo contrastante `bg-slate-900/50 border border-slate-800 p-3 rounded-lg`.
- **Seção Exemplo de Uso:**
  - Manter as abas XML/JSON, mas envelopar o bloco de código em uma janela estilo terminal com bordas arredondadas e botão de cópia rápido (`copy-to-clipboard`) bem visível.