# Especificação Técnica: Gerador Dinâmico de Amostras (XML/JSON Generator)

## 1. Objetivo
Criar uma ferramenta modular onde o usuário seleciona uma versão do TISS, navega na estrutura hierárquica e consegue marcar/desmarcar elementos opcionais por meio de checkboxes. O sistema deve gerar, em tempo real, amostras completas em XML ou JSON usando dados fictícios inteligentes (Faker contextualizado).

## 2. Arquitetura do Back-end (Módulo Isolado de Tools)

### 2.1. Endpoints (`src/routes/tools/generatorRoutes.js`)
- `POST /api/tools/generator/generate`
  - **Payload:** `{ version_id: X, root_node: "mensagemTISS", active_optional_paths: ["mensagemTISS/prestadorParaOperadora/loteGuias"] }`
  - **Resposta:** O conteúdo de texto bruto estruturado do XML e do JSON correspondentes, preenchidos com dados fictícios inteligentes baseados nas restrições (ex: se pattern for `[0-9]{6}`, gerar número compatível).

### 2.2. Inteligência do Serviço (`src/services/tools/generatorService.js`)
- Ler os arquivos XSD físicos da pasta da versão informada.
- Varrer recursivamente as tags a partir do nó raiz. Se o caminho do nó for opcional (`minOccurs="0"`) e NÃO estiver presente no array `active_optional_paths` enviado pelo front-end, o motor ignora ele e seus filhos.
- Aplicar geradores de dados fakes baseados no nome da tag (Ex: se incluir 'CNPJ', gerar CNPJ válido; se incluir 'data', gerar data atual formatada).

## 3. Arquitetura do Front-end (`src/pages/Tools/TissGenerator/`)

### 3.1. Layout da Tela Principal (IDE Dark Tech)
- **Painel Esquerdo:** Seleção da Versão TISS e botões mestres ("Marcar todas as opcionais", "Desmarcar todas").
- **Painel Central (Árvore de Configuração):**
  - Renderizar a árvore hierárquica a partir de `mensagemTISS`.
  - Elementos obrigatórios ganham um ícone ou indicador visual sólido e intransigente.
  - Elementos opcionais (`minOccurs="0"`) ganham um Checkbox customizado com cores vibrantes (ativado = Azul Neon, desativado = Slate opaco). Marcar ou desmarcar um checkbox pai deve ativar/desativar em cascata todos os filhos dele.
- **Barra de Ações Inferior:** Dois botões proeminentes: "Gerar XML" e "Gerar JSON".

### 3.2. Modal de Visualização Avançada
- Ao clicar em gerar, abrir um Modal em Glassmorphism ocupando boa parte da tela.
- **Visualizador de Código:** Integrar um visualizador/editor estruturado (estilo VS Code com colapso de nós) permitindo fechar e abrir blocos de tags (`<ans:cabecalho>`, `<ans:loteGuias>`).
- **Ações de Exportação:** - Botão "Copiar Código" (com feedback de "Copiado!").
  - Botão "Baixar Arquivo" (Gera o download em lote com a extensão `.xml` ou `.json`).