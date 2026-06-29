# Especificação Técnica: Consolidação e Eliminação de Duplicidades no Comparador de Versões

## 1. Objetivo
Eliminar a repetição de registros idênticos na exibição e na geração do histórico de mudanças de versões TISS, garantindo uma listagem limpa e consolidada.

## 2. Ajuste de Engenharia

### 2.1. Refatoração do Endpoint de Leitura (`versionDiffController.js`)
- Na query do Sequelize que busca os registros na tabela `tiss_version_changes` para o usuário, aplicar um agrupamento estrito ou filtro de distinção para evitar registros redundantes na mesma guia:
  ```javascript
  // Garantir unicidade combinando versão, guia, nome do campo e tipo de mudança
  group: ['source_version', 'target_version', 'guia_type', 'field_name', 'change_type']