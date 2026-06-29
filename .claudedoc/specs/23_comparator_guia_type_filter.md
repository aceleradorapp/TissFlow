# Especificação Técnica: Filtro por Tipo de Guia/Transação no Comparador

## 1. Objetivo
Adicionar um componente de filtro por tipo de guia/transação (campo `guia_type`) na tela do Comparador de Versões do usuário, permitindo o isolamento rápido de escopo (Lote de Guias, Glosas, etc.).

## 2. Implementação no Frontend (`src/pages/Tools/VersionComparator/index.jsx`)

### 2.1. Extração Dinâmica de Opções
- Ao receber o array de mudanças do backend, mapear os valores únicos do campo `guia_type` para alimentar um novo componente `<select>` de filtro no topo.

### 2.2. Lógica de Filtragem e Reatividade
- Criar o estado `selectedGuiaType`.
- Filtrar as linhas da tabela combinando a busca por texto (`searchQuery`) E o tipo selecionado (`selectedGuiaType`).
- **Recalcular Totais:** Os contadores de Badges do topo (ADD, MOD, REM) devem recalcular seus valores dinamicamente com base no array já filtrado pelo tipo de guia ativo.