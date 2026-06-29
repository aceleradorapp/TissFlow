# Especificação Técnica: Painel Administrativo Gerador de Diferenças TISS

## 1. Objetivo
Criar uma interface exclusiva para o Administrador/Proprietário que permita selecionar duas versões do TISS já cadastradas no sistema, acionar o motor de comparação (Diff Engine) e persistir os resultados de forma estática no banco de dados.

## 2. Engenharia de Back-end

### 2.1. Endpoint de Processamento (`POST /api/admin/versions/generate-diff`)
- **Acesso:** Restrito via middleware `role(['proprietario'])`.
- **Payload:** `{ sourceVersion, targetVersion }` (Ex: `{ sourceVersion: '4.01.00', targetVersion: '4.02.00' }`).
- **Comportamento:**
  1. Buscar no banco de metadados todos os campos (`tiss_fields`) associados à `sourceVersion` e à `targetVersion`.
  2. Executar a lógica recursiva de Diff cruzando os caminhos por XPath.
  3. Limpar registros antigos na tabela `tiss_version_changes` para esse mesmo par de versões (evitando duplicidade se o admin re-processar).
  4. Realizar um `bulkCreate` no Sequelize injetando todas as adições, remoções e modificações encontradas.

## 3. Engenharia de Front-end

### 3.1. Tela do Administrador (`src/pages/Admin/VersionDiffGenerator.jsx`)
- Rota protegida em `/admin/tools/version-diff`.
- Adicionar link na Sidebar Administrativa como "Gerador de Diff TISS".
- Layout com dois dropdowns para seleção das versões e o botão de disparo.
- Feedback de processamento para evitar cliques duplos do administrador.