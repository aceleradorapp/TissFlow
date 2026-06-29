# Especificação Técnica: Dashboard Real e Tela de Gestão de Ferramentas

## 1. Objetivo
Sincronizar a tela de 'Visão Geral' (Dashboard) com dados 100% reais do banco de dados e criar a nova interface administrativa de 'Gestão de Ferramentas' com controle de status global e associação a planos de assinatura.

## 2. Ajustes no Back-end

### 2.1. Endpoint do Dashboard (`GET /api/admin/dashboard/stats`)
- Substituir qualquer dado mockado (fake) por queries reais do Sequelize:
  * `totalUsers`: Contagem total da tabela `User`.
  * `activeFeatures`: Contagem de `SystemFeature` onde `is_active = true`.
  * `planDistribution`: Array contendo a contagem de usuários por plano (Garante o funcionamento do gráfico).
  * `recentLogs`: `findAll` na tabela de logs limitada a 5 registros recentes com include do nome do usuário.

### 2.2. Endpoints de Gestão de Ferramentas (`src/routes/admin/featureRoutes.js`)
- `GET /api/admin/features` -> Lista todas as ferramentas e os planos associados.
- `PUT /api/admin/features/:id` -> Atualiza o status `is_active` ou altera os planos vinculados (`PlanFeatures`).

## 3. Ajustes no Front-end

### 3.1. Tela de Visão Geral (`src/pages/Admin/Dashboard.jsx`)
- Consumir o endpoint real de estatísticas. 
- Adicionar estados de loading e travar o componente caso o banco retorne erro, exibindo feedback limpo.

### 3.2. Nova Página: Gestão de Ferramentas (`src/pages/Admin/FeatureManagement.jsx`)
- **Rota:** Criar a página vinculada a `/admin/features` e adicioná-la ao menu da `Sidebar.jsx` logo abaixo de "Planos".
- **Interface:** Layout em grid contendo Cards das ferramentas com:
  * Nome e slug identificador.
  * Switch do Tailwind (`shadcn/switch` ou customizado) para ligar/desligar `is_active`.
  * Seção "Planos Inclusos" com checkboxes para associar a ferramenta aos planos em tempo real.