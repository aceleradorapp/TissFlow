# Especificação Técnica: Exibição Explícita de Mudanças de Regex e Padrões TISS

## 1. Objetivo
Garantir que ao expandir uma tag modificada por alteração de padrão (regex), o desenvolvedor visualize com precisão cirúrgica a string exata do padrão da versão antiga e da nova versão nos cards comparativos.

## 2. Ajustes de Engenharia

### 2.1. Refatoração do Motor de Diff (Backend - `versionDiffService.js`)
- Na função que detecta mudanças de padrão/regex (`pattern` ou `restrictions`), certificar-se de extrair o valor string bruto da tag `<xs:pattern value="...">` de ambas as versões.
- A string salva no banco de dados deve estruturar explicitamente os metadados ou o campo `description` de forma que o frontend consiga ler os dois valores reais. Ex de formato estruturado na descrição: `padrão regex alterado: [0-9]{14} → [0-9]{14}|\d{11}`.

### 2.2. Ajuste na Interface de Expansão (Frontend - `VersionComparator/index.jsx`)
- Alterar a renderização dos cards expansíveis. Se o motivo da mudança for `padrão regex alterado`, quebrar a string ou ler as propriedades de regex para exibir:
  * **Card Esquerdo (Como era):** `padrão regex: [Expressão Antiga]`
  * **Card Direito (Como ficou):** `padrão regex: [Expressão Nova]`