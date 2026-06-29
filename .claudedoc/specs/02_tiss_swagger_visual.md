# Especificação Técnica: Swagger Visual TISS (Leitura Dinâmica de Schemas)

## 1. Objetivo
Criar uma interface estilo IDE avançada para navegação hierárquica e aninhada da estrutura do padrão TISS (nó universal `mensagemTISS`), lendo diretamente os arquivos XSD armazenados fisicamente em disco e resolvendo dependências em memória.

## 2. Arquitetura do Back-end (Módulo Isolado de Tools)

### 2.1. Endpoints (`src/routes/tools/swaggerRoutes.js`)
- `GET /api/tools/swagger/versions` -> Retorna as versões da tabela `tiss_versions` onde `is_active = true`.
- `GET /api/tools/swagger/tree?version_id=X&node_path=Y` -> Retorna os filhos diretos de um nó específico baseado no arquivo XSD.

### 2.2. O Motor do Parser em Memória (`src/services/tools/swaggerService.js`)
1. Ao selecionar a versão, localizar o caminho físico da pasta (ex: `src/storage/schemas/v4_01_00/`).
2. O ponto de partida universal da árvore será sempre o `<element name="mensagemTISS">` localizado no arquivo principal (geralmente `tissV4_01_00.xsd` ou similar).
3. Usar o `fast-xml-parser` para carregar o arquivo. Se o elemento selecionado apontar para um `type` complexo (ex: `type="ans:cabecalhoTransacao"`), o serviço deve varrer os arquivos daquela pasta (resolvendo os `<include>`), achar o `<complexType name="cabecalhoTransacao">` e ler sua `<sequence>` ou `<choice>`.
4. Retornar para o front-end apenas o nível solicitado (Lazy Loading) ou a árvore estruturada para evitar sobrecarga, contendo as propriedades de cada tag: `name`, `type`, `minOccurs`, `maxOccurs`, `description` (extraída da tag `documentation`).

## 3. Arquitetura do Front-end (`src/pages/Tools/SwaggerVisual/`)

### 3.1. Layout e Visual (IDE Dark Tech)
- **Painel Esquerdo:** Dropdown sutil para escolher a versão ativa. Abaixo, uma legenda clara de cores (Obrigatório vs Opcional).
- **Painel Central (A Árvore Viva):**
  - Exibir inicialmente apenas a raiz: `📁 mensagemTISS`.
  - Ao clicar no ícone de expansão (`>`), disparar requisição para a API buscando os filhos diretos daquela tag.
  - Campos Obrigatórios (`minOccurs >= 1`): Texto destacado em Azul Neon.
  - Campos Opcionais (`minOccurs = 0`): Texto em Cinza Opaco.
- **Painel Direito (Inspeção Glassmorphic):**
  - Ao clicar em cima do texto de qualquer tag, carregar as propriedades técnicas dela no painel direito: Descrição oficial da ANS, Tipo do dado, Ocorrências (`min - max`), e se houver restrições de tamanho ou enums, exibir em formato de tabela minimalista.
  - **Amostra de Código:** Exibir um bloco de código estético contendo o exemplo daquela tag em XML e em JSON para o dev copiar.