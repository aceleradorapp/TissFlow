# Estrutura do Banco de Dados (MySQL + Sequelize) - TISSflow

Este arquivo reflete o estado atual das tabelas do banco de dados. Deve ser atualizado a cada nova migration executada.

## Modelagem Conceitual das Tabelas

### 1. Tabelas de Suporte (Dicionários)

#### `roles` (Tipos de Usuário)
- `id`: INT (PK, Auto-increment)
- `name`: VARCHAR(50) (Valores padrão: 'visitante', 'prestador', 'proprietario')
  * *visitante*: Usuário em teste, acesso limitado.
  * *prestador*: Usuário normal do sistema (cliente pagante).
  * *proprietario*: Administrador total do sistema (Acesso ao painel ADM, gerencia usuários/planos).
- `created_at`: TIMESTAMP
- `updated_at`: TIMESTAMP

#### `plans` (Planos de Acesso)
- `id`: INT (PK, Auto-increment)
- `name`: VARCHAR(100) (Ex: 'Bronze', 'Prata', 'Ouro')
- `price`: DECIMAL(10,2)
- `created_at`: TIMESTAMP
- `updated_at`: TIMESTAMP

#### `tools` (Catálogo de Ferramentas)
- `id`: INT (PK, Auto-increment)
- `name`: VARCHAR(150) (Ex: 'Comparador de Versões TISS', 'Validador de XML')
- `slug`: VARCHAR(150) (Unique, ex: 'comparador-tiss', 'validador-xml')
- `description`: TEXT
- `is_active`: BOOLEAN (Default: true)
- `created_at`: TIMESTAMP
- `updated_at`: TIMESTAMP

---

### 2. Tabelas Principais

#### `users` (Usuários do Sistema)
- `id`: INT (PK, Auto-increment)
- `role_id`: INT (FK -> `roles.id`)
- `plan_id`: INT (FK -> `plans.id`, Nullable para proprietários ou visitantes sem plano)
- `name`: VARCHAR(255)
- `email`: VARCHAR(255) (Unique)
- `password`: VARCHAR(255) (Hash Bcrypt)
- `status`: ENUM('active', 'inactive', 'suspended') (Default: 'active')
- `password_reset_token`: VARCHAR(255) (Nullable)
- `password_reset_expires`: TIMESTAMP (Nullable)
- `created_at`: TIMESTAMP
- `updated_at`: TIMESTAMP

---

### 3. Tabelas de Relacionamento (Controle de Acesso)

#### `plan_tools` (Vínculo de Ferramentas por Plano)
- `plan_id`: INT (PK, FK -> `plans.id`)
- `tool_id`: INT (PK, FK -> `tools.id`)
- `created_at`: TIMESTAMP
- `updated_at`: TIMESTAMP