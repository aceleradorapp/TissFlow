# DOCUMENTO DE ARQUITETURA E ESPECIFICAÇÃO CORE: IDE INTERATIVA TISS (V1)

## 1. DECLARAÇÃO DE ESCOPO E FILOSOFIA DE DESIGN
O objetivo desta ferramenta é transcender os validadores clássicos e formulários estáticos de mercado. O sistema deve atuar como uma IDE (Ambiente de Desenvolvimento Integrado) Visual e Reativa para arquivos XML do padrão TISS. 

A interface do usuário (UI) não possui campos hardcoded (fixos); ela é **totalmente escrava e gerada dinamicamente** a partir da união entre o arquivo XML enviado pelo usuário e as regras estruturais contidas no arquivo XSD físico (Schema da ANS) correspondente à versão detectada.

---

## 2. ENGENHARIA DE BACKEND (MOTOR RECURSIVO UNIVERSAL)

### 2.1. Pipeline de Processamento de Arquivos (`POST /api/tools/ide/parse`)
O backend disponibilizará um único endpoint agnóstico que processará qualquer variante de XML TISS (Lotes de Guias, Recursos de Glosa, Elegibilidade, Cancelamentos, etc.) seguindo o fluxo estrito:

1. **Detecção Primitiva:** Realizar um parse inicial ultra-rápido na raiz do buffer com `fast-xml-parser` para capturar as chaves `<ans:Padrao>` (versão do schema, ex: 4.02.00) e `<ans:identificacaoTransacao><ans:tipoTransacao>` (ex: RECURSO_GLOSA).
2. **Carregamento de Verdade Estrutural (XSD):** Localizar em disco a pasta correspondente à versão (ex: `src/storage/schemas/v4_02_00/`) e carregar em memória as regras do XSD mapeado para aquela transação específica.
3. **Análise Recursiva Tag-a-Tag (Parser Semântico):** Varrer a árvore do XML enviado e comparar com o XSD avaliando:
   - **Nomenclatura e Hierarquia:** Posição e escrita exata dos elementos.
   - **Obrigatoriedade (`minOccurs`):** Identificar se algum elemento obrigatório ficou ausente.
   - **Restrições de Tipo:** Validar tipos primitivos (string, date, time, integer, boolean) e facetas (tamanho de string, padrões regex, enums de tabelas).
4. **Geração do Grafo de Estado Dinâmico (Response):** O retorno da API para o frontend deve ser um JSON composto por:
   - `metadata`: Versão detectada, tipo de transação, prólogo do XML e hash original.
   - `tree`: Grafo estruturado que espelha o XML, onde **cada nó (tag)** possui propriedades de valor, tipo XSD, obrigatoriedade e status de validação.
   - `errors`: Array de objetos contendo os erros indexados por caminho absoluto (XPath) e linha do código (ex: `{ path: "mensagemTISS/cabecalho/falhaNegocio", type: "XSD_VALIDATION", line: 12, message: "O valor deve ser numérico" }`).

---

## 3. ENGENHARIA DE FRONTEND (INTERFACE DE CONTAINERS VIVOS)

A página principal (`src/pages/Tools/TissIde/`) operará em um layout moderno de tela dividida (Split Screen de alta densidade).

### 3.1. Coluna Esquerda: A Árvore de Blocos Interativos (UI Semântica)
O XML será renderizado como uma cascata de contêineres colapsáveis (Accordions) aninhados que herdam um **Código de Cores de Semáforo Crítico**:

- 🟢 **Containers/Inputs Verdes (Sucesso):** O bloco e as tags internas estão 100% em conformidade com o XSD.
- 🔴 **Containers/Inputs Vermelhos (Erro Crítico):** Tags com valores inválidos ou blocos que falharam em restrições.
  - **Injeção de Blocos Fantasmas:** Se o XSD exigir uma tag obrigatória que NÃO existe no XML enviado, a interface deve renderizar o campo em vermelho translúcido com o nome exato da tag, exibindo a mensagem: `"Tag obrigatória ausente. Clique para inserir"`. Ao clicar, o campo ganha vida e o input é liberado para digitação.
- 🟠 **Containers Laranjas (Observação/Aviso):** Elementos opcionais preenchidos que possuem alertas de negócio ou inconsistências leves.
- ⚪ **Campos Opcionais Inativos:** Tags opcionais (`minOccurs="0"`) que não vieram no XML original aparecem apagadas (opacidade 40%) precedidas por um checkbox desmarcado. Se o usuário marcar o checkbox, a tag é integrada ao grafo e o input é liberado.

### 3.2. Interatividade Total nos Inputs
Cada tag convertida em campo de formulário deve usar componentes especializados baseados em seu tipo XSD primitivo:
- Tipos `date` ou `data` -> Abrem DatePickers customizados em dark/light mode.
- Tipos `time` ou `hora` -> Abrem seletores de hora formatados (`HH:MM:SS`).
- Tipos com Enums do XSD -> Convertem-se automaticamente em Dropdowns filtráveis contendo as opções válidas.

### 3.3. Coluna Direita: O Editor XML Sincronizado (Split Code Editor)
- Um visualizador/editor completo (usando `@monaco-editor/react` ou equivalente).
- **Sincronização Bidirecional Direta (Real-time):** Qualquer alteração digitada ou selecionada nos blocos visuais da esquerda reconstrói o XML e atualiza o código da direita instantaneamente.
- **Destaque de Linhas:** As linhas do editor de código que contêm erros devem ganhar uma decoração de fundo avermelhada sutil refletindo o mapa de erros do backend.

---

## 4. PERSISTÊNCIA E CICLO DE VIDA DO ARQUIVO

### 4.1. Persistência de Dados Relacionais (MySQL via Sequelize)
- **Tabela `user_documents`:** Guarda o histórico de documentos trabalhados pelo usuário.
  - Campos: `id`, `user_id`, `filename` (apelido customizado), `raw_xml` (LONGTEXT), `version`, `transaction_type`, `error_count`, `created_at`.
- **Controle de Acesso:** Vinculado estritamente à segurança Multi-tenant do usuário autenticado. Cada usuário gerencia seus próprios arquivos.

### 4.2. Ações de Exportação (Barra de Ferramentas Persistente)
- **Botão "Download XML Corrigido":** Gera a compilação final em formato string, anexa o prólogo original exato (`<?xml version="1.0" encoding="ISO-8859-1"?>`) e dispara o download físico do arquivo `.xml`.
- **Botão "Salvar na Nuvem TISSflow":** Realiza o commit do estado atual do XML para a tabela `user_documents` no banco de dados.