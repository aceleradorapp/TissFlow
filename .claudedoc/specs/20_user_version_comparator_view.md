# Especificação Técnica: Tela de Visualização do Comparador de Versões (Usuário Final)

## 1. Objetivo
Criar o endpoint público/logado de leitura de diferenças e a página no frontend onde o usuário comum visualiza o relatório de modificações entre duas versões do TISS.

## 2. Engenharia de Back-end
- **Endpoint (`GET /api/tools/version-diff`)**: Recebe por query params `?sourceVersion=4.01.00&targetVersion=4.02.00`.
- Retorna o array de registros da tabela `tiss_version_changes` filtrado para o par de versões selecionado. Rota liberada para qualquer usuário logado (Plano ativo).

## 3. Engenharia de Front-end (`src/pages/Tools/VersionComparator/`)
- **Página do Usuário:** Criar `index.jsx` dentro de ferramentas.
- **Vínculo:** Adicionar ao `Sidebar.jsx` sob o grupo de "Ferramentas TISS" com o nome "Comparador de Versões" (Rota: `/tools/version-diff`).
- **Layout:** Seguir as diretrizes de design do Modo Claro (fundo claro, textos escuros de alto contraste) e Modo Escuro. Exibir busca por nome de tag, filtros por tipo de alteração (ADD/MOD/REM) e uma tabela limpa com as descrições.