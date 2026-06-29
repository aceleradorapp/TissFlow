# Contexto Técnico do Projeto - TISSflow
> Atualizado em: 2026-06-26 | Versão: pós-Fase 3 completa

Este arquivo é o mapa técnico completo do projeto. Deve ser lido no início de toda nova sessão junto com `instructions.md`, `ui-pattern.md` e `roadmap.md`.

---

## 1. Visão Geral

**TISSflow** é um SaaS B2B para o ecossistema TISS (Troca de Informações na Saúde Suplementar) da ANS. Oferece ferramentas de validação e gestão de guias médicas para clínicas, hospitais e operadoras de saúde.

**Repositório local:** `d:\Projetos\TissExpert\`
**Estrutura de pastas raiz:**
```
TissExpert/
├── backend/         # Node.js + Express + Sequelize
├── frontend/        # React + Vite + Tailwind CSS
└── .claudedoc/      # Documentação de contexto do projeto
```

---

## 2. Back-end

### 2.1 Stack e dependências principais
- **Runtime:** Node.js com CommonJS (`require`)
- **Framework:** Express 5
- **ORM:** Sequelize v6 + driver `mysql2`
- **Autenticação:** `jsonwebtoken` (JWT, 8h de validade) + `bcryptjs` (hash de senhas)
- **CLI de banco:** `sequelize-cli` (dev dependency)
- **Config de env:** `dotenv` via `backend/.env`

### 2.2 Arquivo `.env` (nunca alterar sem aviso do usuário)
```
PORT=3001
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_NAME=tissflow_db
DB_USER=root
DB_PASSWORD=          # root local sem senha — deixar vazio
JWT_SECRET=super_secret_key
```

### 2.3 Configuração do banco (`backend/config/database.js`)
- Carrega dotenv e exporta `development/test/production` usando variáveis `DB_*`
- `dialect: 'mysql'`, `define: { timestamps: true, underscored: true }`
- O `.sequelizerc` aponta a CLI para este arquivo em vez do `config/config.json`

### 2.4 Banco de dados — Tabelas (todas via migrations)
| Tabela         | Descrição                                                    |
|----------------|--------------------------------------------------------------|
| `roles`        | Papéis: `proprietario`, `prestador`                         |
| `plans`        | Planos: Bronze, Prata, Ouro (com campo `price`)             |
| `tools`        | Ferramentas TISS (name, slug único, description, is_active) |
| `users`        | Usuários (FK `role_id`, FK `plan_id`, status, reset token)  |
| `plan_tools`   | Junção N:N entre `plans` e `tools`                          |
| `SequelizeMeta`| Controle interno de migrations executadas                    |

**Seeders executados:**
- Roles: `proprietario`, `prestador`
- Plans: Bronze (49.90), Prata (99.90), Ouro (199.90)
- Tools: Comparador TISS, Validador XML
- User admin: `admin@tissflow.com` / `admin123` (role: `proprietario`)

### 2.5 Models e Associações
```
User.belongsTo(Role, { as: 'role', foreignKey: 'role_id' })
User.belongsTo(Plan, { as: 'plan', foreignKey: 'plan_id' })
Plan.belongsToMany(Tool, { through: 'plan_tools', as: 'tools', foreignKey: 'plan_id' })
Tool.belongsToMany(Plan, { through: 'plan_tools', as: 'plans', foreignKey: 'tool_id' })
```
**Hooks no User Model:**
- `beforeCreate` e `beforeUpdate`: hasheia `password` com `bcryptjs` se alterado
- `checkPassword(plain)`: método de instância que usa `bcrypt.compare`

### 2.6 Servidor (`backend/src/server.js`)
```
GET  /health            → { status: 'ok', timestamp }
/api/auth  → authRoutes
/api/admin → adminRoutes
```

### 2.7 Rotas de Autenticação (`/api/auth`)
| Método | Rota              | Auth?  | Controller        | Descrição                              |
|--------|-------------------|--------|-------------------|----------------------------------------|
| POST   | /register         | —      | register          | Cria usuário como `prestador`          |
| POST   | /login            | —      | login             | Retorna JWT + safeUser (com role.name) |
| POST   | /forgot-password  | —      | forgotPassword    | Gera token SHA-256; link no console    |
| POST   | /reset-password   | —      | resetPassword     | Valida hash + expiração; atualiza senha|
| GET    | /profile          | Bearer | getProfile        | Retorna user + role + plan + tools     |

**Segurança implementada:**
- `safeUser()` exclui `password`, `password_reset_token`, `password_reset_expires`
- Login: mesmo erro para e-mail inexistente e senha errada (previne enumeração)
- Forgot-password: resposta idêntica independente de o e-mail existir
- Reset token: apenas o hash SHA-256 é armazenado no banco; token bruto vai ao console
- Token expira em 1 hora (`password_reset_expires`)

### 2.8 Rotas Administrativas (`/api/admin`)
Todas as rotas usam `guard = [authMiddleware, roleMiddleware(['proprietario'])]`

| Método | Rota                       | Controller        | Descrição                                    |
|--------|----------------------------|-------------------|----------------------------------------------|
| GET    | /users                     | listUsers         | Lista todos os usuários (sem campos sensíveis)|
| PATCH  | /users/:id/status          | updateUserStatus  | Altera status (active/inactive/suspended)     |
| POST   | /users/:id/reset-password  | resetUserPassword | Admin reseta senha de qualquer usuário        |
| GET    | /plans                     | listPlans         | Lista planos com ferramentas associadas       |
| POST   | /tools                     | createTool        | Cria nova ferramenta (slug único)             |
| GET    | /tools                     | listTools         | Lista todas as ferramentas                    |
| POST   | /plans/:planId/tools       | setPlanTools      | Substitui atomicamente todas as tools do plano|

**Segurança implementada:**
- `updateUserStatus`: bloqueia self-deactivation (`user.id === req.user.id && status !== 'active'`)
- `setPlanTools`: usa `plan.setTools(toolIds)` — substitui TODOS os vínculos em uma transação
- `createTool`: captura `UniqueConstraintError` e retorna 409 para slug duplicado

### 2.9 Middlewares
**`authMiddleware`** (verifica JWT):
1. Extrai Bearer token do header Authorization
2. `jwt.verify` com `JWT_SECRET`
3. `User.findByPk` com include de Role
4. Rejeita se `user.status !== 'active'`
5. Anexa `req.user` (com `req.user.role.name` disponível)

**`roleMiddleware(allowedRoles)`** (factory):
- Verifica `req.user.role.name` contra array de roles permitidos
- Retorna 403 se não permitido

---

## 3. Front-end

### 3.1 Stack e dependências principais
- **Build:** Vite 8 + React 18
- **Estilo:** Tailwind CSS v3 (`darkMode: 'class'`)
- **Roteamento:** `react-router-dom`
- **HTTP:** `axios` via instância configurada em `src/services/api.js`
- **Toasts:** `sonner` com `<Toaster position="top-right" richColors />`
- **Ícones:** `lucide-react`

### 3.2 Cliente HTTP (`frontend/src/services/api.js`)
```js
baseURL: 'http://localhost:3001/api'
// Interceptor: adiciona Authorization: Bearer <token> se tissflow_token existir no localStorage
```

### 3.3 Armazenamento no localStorage
| Chave            | Valor                                          |
|------------------|------------------------------------------------|
| `tissflow_token` | JWT string                                     |
| `tissflow_user`  | JSON do safeUser (id, name, email, role, etc.) |

### 3.4 Estrutura de rotas (`frontend/src/App.jsx`)
| Rota              | Componente     | Proteção    |
|-------------------|----------------|-------------|
| `/`               | Home           | pública     |
| `/login`          | Login          | pública     |
| `/register`       | Register       | pública     |
| `/forgot-password`| ForgotPassword | pública     |
| `/reset-password` | ResetPassword  | pública     |
| `/dashboard`      | Dashboard      | PrivateRoute|
| `/admin/users`    | AdminUsers     | AdminRoute  |
| `/admin/plans`    | AdminPlans     | AdminRoute  |

### 3.5 Guards de rota
**`PrivateRoute`:** verifica se `tissflow_token` existe no localStorage. Se não, redireciona para `/login`.

**`AdminRoute`:** verifica token E `tissflow_user.role === 'proprietario'`. Redireciona para `/login` ou `/dashboard` conforme o caso.

### 3.6 Componentes base (`src/components/`)
Todos seguem o padrão `ComponentName/ComponentName.jsx` + `ComponentName/index.js`.

| Componente      | Variantes / Props chave                                       |
|-----------------|---------------------------------------------------------------|
| `Button`        | `variant`: primary, secondary, danger, ghost; `isLoading`    |
| `Input`         | `label`, `icon` (lucide), `error`, tipos text/email/password |
| `Card`          | Wrapper semântico com `bg-white dark:bg-slate-900 rounded-2xl`|
| `DashboardLayout`| Sidebar retrátil, drawer mobile, dark toggle, logout         |

### 3.7 Páginas públicas
- **`Home`:** Landing page completa (Navbar sticky, Hero com blobs animados, Features grid, Plans cards, CTA, Footer). Dark mode compatível.
- **`Login`:** Form com validação local → `POST /auth/login`. Redireciona admin para `/admin/users`, user para `/dashboard`.
- **`Register`:** Form → `POST /auth/register`. Redireciona para `/login` com state `fromRegister: true`.
- **`ForgotPassword`:** Form → `POST /auth/forgot-password`.
- **`ResetPassword`:** Lê `?token=` da URL → `POST /auth/reset-password`.

### 3.8 Páginas autenticadas
**`Dashboard`** (`/dashboard`):
- Chama `GET /auth/profile`
- Estados: loading spinner → sem plano → sem ferramentas → grid de ferramentas

**`Admin/Users`** (`/admin/users`):
- Chama `GET /admin/users`
- Tabela com badges de status coloridos
- Select por linha chama `PATCH /admin/users/:id/status`

**`Admin/Plans`** (`/admin/plans`):
- Carrega planos e ferramentas em paralelo
- Estado de seleção baseado em `Set`
- Checkboxes por ferramenta; salvar chama `POST /admin/plans/:planId/tools`

### 3.9 Configuração do Tailwind (`frontend/tailwind.config.js`)
```js
darkMode: 'class'
content: ['./index.html', './src/**/*.{js,jsx}']
```
**Paleta padrão (ver `ui-pattern.md` para tabela completa):**
- Fundo: `bg-slate-50` / `dark:bg-slate-950`
- Cards: `bg-white` / `dark:bg-slate-900`
- Bordas: `border-slate-200` / `dark:border-slate-800`
- Primária: `blue-600` / Sucesso: `emerald-500`
- Gradiente de marca: `from-blue-600 to-emerald-500`

---

## 4. Fluxos críticos

### Autenticação completa
```
Register → POST /auth/register → { user, token } → localStorage → /dashboard
Login    → POST /auth/login    → { user, token } → localStorage → /dashboard ou /admin/users
```

### Reset de senha (usuário)
```
ForgotPassword → POST /auth/forgot-password → hash salvo no DB; token bruto no console
ResetPassword  → POST /auth/reset-password  → hash do token comparado, senha atualizada
```

### Associação de ferramentas a planos (admin)
```
Admin/Plans → GET /admin/plans + GET /admin/tools (paralelo)
           → Checkboxes no frontend
           → POST /admin/plans/:id/tools { toolIds: [...] }
           → plan.setTools(toolIds) substitui TUDO atomicamente
```

---

## 5. Fase 4 — Pendente

- **Etapa 4.1:** Ferramenta — Comparador de versões TISS
- **Etapa 4.2:** Ferramenta — Validador de XML TISS

Cada ferramenta terá rota no backend e página dedicada no frontend, acessível via Dashboard conforme as ferramentas vinculadas ao plano do usuário.
