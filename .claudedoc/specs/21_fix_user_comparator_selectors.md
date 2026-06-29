# Especificação Técnica: Correção de Seletores Dinâmicos no Comparador de Versões (Usuário)

## 1. Objetivo
Garantir que a página do usuário do Comparador de Versões possua dois seletores (dropdowns) dinâmicos para a escolha da Versão Base e Versão Nova, alimentados pelas versões disponíveis no banco de dados, corrigindo o bloqueio visual atual.

## 2. Ajustes de UI/UX no Frontend (`src/pages/Tools/VersionComparator/index.jsx`)
- **Barra de Filtros (Topo):** Inserir um contêiner com dois componentes de `Select`:
  1. **Versão Base (De):** Lista as versões do banco (ex: 4.01.00, 4.02.00).
  2. **Versão Nova (Para):** Lista as mesmas versões.
- **Gatilho de Requisição (`useEffect`):** Sempre que o usuário alterar qualquer um dos dropdowns, disparar a requisição `GET /api/tools/version-diff?sourceVersion=X&targetVersion=Y`.
- **Estado Inicial:** Se nenhuma versão estiver selecionada, exibir um estado amigável pedindo para: *"Selecione duas versões acima para iniciar a comparação técnica."* (em vez do aviso rígido de erro atual).
- Se os dados existirem para o par selecionado, renderizar os cards de contagem e a tabela de tags modificadas imediatamente.