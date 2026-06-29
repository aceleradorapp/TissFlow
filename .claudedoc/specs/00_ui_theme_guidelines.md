# Diretrizes de Design UI/UX: Padronização do Modo Claro (TISSflow)

## 1. Objetivo
Garantir consistência visual absoluta e alto contraste no Modo Claro em todas as telas do sistema, usando como referência de sucesso a implementação da tela 'Swagger TISS'. O Modo Escuro (Dark) não deve sofrer alterações, pois já está perfeito.

## 2. Mapa de Cores Semânticas (Tailwind)

### 2.1. Telas Principais, Dashboards e Painéis
- **Fundo da Página (Background Global):** `bg-slate-50 dark:bg-slate-950`
- **Fundo de Cards, Contêineres e Painéis Centrais:** `bg-white dark:bg-slate-900`
- **Bordas de Separação e Linhas de Divisão:** `border-slate-200 dark:border-slate-800`

### 2.2. Tipografia e Textos
- **Títulos Principais (H1, H2):** `text-slate-900 dark:text-slate-50`
- **Textos Secundários / Labels Descritivos:** `text-slate-600 dark:text-slate-400 font-medium`
- **Subtextos / Textos de Apoio Pequenos:** `text-slate-500 dark:text-slate-500`

### 2.3. Elementos de Formulário e Inputs
- **Fundo do Input:** `bg-white dark:bg-slate-950`
- **Borda do Input:** `border-slate-300 focus:border-blue-500 dark:border-slate-800`
- **Texto Interno do Input:** `text-slate-900 dark:text-white`
- **Texto de Placeholder:** `placeholder-slate-400 dark:placeholder-slate-600`

### 2.4. Componentes Expandíveis (Accordions) e Tabelas
- **Cabeçalho do Accordion (Modo Claro):** `bg-slate-100/80 text-slate-800 hover:bg-slate-200/50`
- **Fundo de Linhas de Tabela Intercaladas:** `even:bg-slate-50/50 dark:even:bg-slate-900/30`