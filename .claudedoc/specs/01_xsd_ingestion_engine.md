# Especificação Técnica: Motor de Ingestão e Armazenamento XSD (Core Schema Engine)

## 1. Objetivo
Substituir a estratégia de quebra de metadados relacionais no MySQL por um sistema robusto de Armazenamento Físico de Schemas (XSD) em Disco + Leitura e Resolução de Dependências em Memória. O upload é uma funcionalidade EXCLUSIVA do usuário com perfil 'proprietario'.

## 2. Impacto no Banco de Dados (MySQL)
A tabela `tiss_versions` continua sendo a única mantida para controle de integridade.
- As tabelas `tiss_types`, `tiss_fields` e `tiss_enums` NÃO serão mais populadas durante o upload. Elas podem ser mantidas no banco para futuras necessidades, mas o motor principal irá ignorá-las, focando na leitura direta dos arquivos.

## 3. Arquitetura do Back-end

### 3.1. Rota e Segurança
- **Endpoint:** `POST /api/admin/tiss/upload`
- **Middlewares:** `authMiddleware` -> `roleMiddleware(['proprietario'])`
- **Payload (Multipart/Form-Data):**
  - `version`: String (ex: "4.01.00")
  - `release_date`: Date (Data de vigência oficial)
  - `files`: Array de arquivos `.xsd` (Gerenciado via Multer)

### 3.2. Fluxo do Controller (`src/controllers/tissController.js`)
1. Validar se a role do usuário logado é rigorosamente `proprietario`.
2. Receber a string de versão e normalizar o nome da pasta (ex: `version: "4.01.00"` vira a pasta `v4_01_00`).
3. Verificar se a pasta `src/storage/schemas/v4_01_00/` já existe. Se existir, deletar os arquivos antigos (permitindo re-upload/sobrescrita limpa).
4. Criar a pasta destino utilizando o módulo `fs` nativo do Node.js.
5. Salvar individualmente cada arquivo XSD enviado pelo Multer dentro dessa pasta, mantendo o nome original do arquivo intacto (essencial para os `<include>` e `<import>`).
6. Registrar ou atualizar a versão na tabela `tiss_versions` salvando o status `is_active = true`.

## 4. Arquitetura do Front-end (`src/pages/Admin/TissIngestion.jsx`)
- Manter o layout premium com Dropzone nativo.
- Enviar os dados via `Axios` para o novo endpoint configurando o `headers: { 'Content-Type': 'multipart/form-data' }`.
- Exibir feedback visual de processamento e disparar o Toast do Sonner confirmando o armazenamento físico dos arquivos e ativação da versão.