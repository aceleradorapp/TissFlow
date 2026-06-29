# Especificação Técnica: Auditoria de Banco e Enriquecimento de Metadados de Regex TISS

## 1. Objetivo
Garantir que os padrões regex brutos (`patterns`) definidos nos tipos customizados do XSD da ANS sejam devidamente armazenados no Banco de Metadados e transferidos para o histórico de mudanças (`tiss_version_changes`).

## 2. Fluxo de Correção

### 2.1. Verificação e Ajuste do Model (`tiss_fields` / `tiss_types`)
- Garantir que a estrutura de tabelas possua o campo `pattern` ou `regex` (geralmente uma string de tamanho TEXT) onde a regra de expressão regular do XSD é persistida.

### 2.2. Atualização do Algoritmo de Diff (`versionDiffService.js`)
- Ao comparar dois campos que sofreram alteração do tipo ou padrão, o serviço DEVE extrair a string literal da regex guardada nos metadados de restrição de cada versão.
- Substituir o texto genérico `"padrão regex alterado"` no campo `description` por:
  `padrão regex alterado: REGEX_DA_VERSAO_ANTIGA → REGEX_DA_VERSAO_NOVA`.
- Se um tipo não possuir regex (como uma string aberta), salvar como `N/A`.