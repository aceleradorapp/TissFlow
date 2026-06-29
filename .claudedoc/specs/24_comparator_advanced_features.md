# Especificação Técnica: Detalhes Estruturados, Snippet XML e Exportação de PDF no Comparador

## 1. Objetivo
Implementar a expansão de detalhes de campos (De/Para), o modal de visualização de contexto de snippet XML e o motor de geração de relatórios PDF customizados de acordo com os filtros ativos na tela.

## 2. Engenharia de Front-end

### 2.1. Expansão de Linha (Cards De/Para)
- Transformar as linhas da tabela em componentes expansíveis. 
- Formatar o campo `description` do banco que contém as mudanças estruturais em dois blocos visuais nítidos usando Tailwind: um bloco de estado anterior (`bg-rose-500/10 text-rose-400`) e um bloco de estado novo (`bg-emerald-500/10 text-emerald-400`).

### 2.2. Modal de Snippet XML Fictício
- Adicionar o botão com ícone de código na linha. Ao clicar, abrir um Modal (`ContextXmlModal`).
- O modal deve renderizar um bloco de código estruturado que simula a tag em seu contexto hierárquico (XPath), destacando a linha da tag modificada com a classe `bg-amber-500/20 text-amber-300` ou similar.

### 2.3. Motor de PDF Dinâmico (`jsPDF` + `jspdf-autotable`)
- Instalar e utilizar uma biblioteca client-side de PDF de alta performance.
- Capturar estritamente o array que já passou pelos filtros de texto (`searchQuery`) e de contexto (`selectedGuiaType`) ativos na UI.
- Gerar o PDF contendo:
  1. Cabeçalho TISSflow com a data de geração e o par de versões comparado.
  2. Sumário Executivo (Quantidade de itens adicionados/removidos/modificados do filtro atual).
  3. Tabela formatada contendo as colunas Campo, Guia, Tipo de Mudança e Detalhes da Alteração.