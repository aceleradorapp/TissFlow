# Especificação Técnica: Visualizador Humanizado e Validador de XML TISS

## 1. Objetivo
Criar a ferramenta 'Visualizador Humanizado', permitindo que o usuário faça o upload de um XML TISS, tenha detecção automática de tipo/versão, visualize os dados estruturados em formato de guias médicas comerciais limpas e inspecione o código XML bruto de forma sincronizada.

## 2. Engenharia do Back-end (Módulo Isolado de Tools)

### 2.1. Endpoint Principal (`POST /api/tools/viewer/parse`)
- **Payload:** Arquivo `.xml` bruto via Multer buffer.
- **Lógica de Ingestão:**
  1. Realizar o parse rápido da string XML com `fast-xml-parser`.
  2. Extrair automaticamente os metadados do cabeçalho (`Padrao`, `tipoTransacao`, `CNPJ`).
  3. Validar a estrutura do XML contra os arquivos XSD físicos armazenados na pasta correspondente à versão detectada (`src/storage/schemas/v.../`).
  4. Retornar o JSON totalmente mastigado contendo a lista de guias estruturadas E um array de erros de validação mapeados por tag/linha (se houverem).

## 3. Engenharia do Front-end (`src/pages/Tools/TissViewer/`)

### 3.1. Tela de Entrada (Dropzone)
- Um estado inicial imponente focado em drag-and-drop. Assim que o arquivo é solto, exibe animação de leitura de metadados ("Analisando estrutura da ANS...").

### 3.2. Painel de Visualização Dual-Mode
- **Topo:** Barra de informações contendo a versão detectada automaticamente (Ex: TISS 4.02.00) e tipo de transação. Botões para alternar entre "Visualização em Ficha" e "Código XML".
- **Esquerda (Navegador do Lote):** Uma lista de cards rápidos para cada guia encontrada dentro do XML (Ex: Guia SP/SADT - Nº 256711789).
- **Centro (Ficha da Guia):** Renderização limpa dos blocos de dados (Beneficiário, Prestadores, Procedimentos, Despesas) usando tabelas minimalistas e badges estilizados.
- **Gaveta Lateral (XML Viewer):** Gaveta em overlay de alto contraste que exibe o arquivo XML original indexado por linhas.