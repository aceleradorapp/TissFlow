# Especificação Técnica: Gerenciamento Centralizado de Funcionalidades (SaaS Core)

## 1. Objetivo
Registrar e gerenciar todas as ferramentas (features) do sistema no banco de dados MySQL, permitindo controle de status ativo/inativo, vinculação a planos e liberação de add-ons individuais por usuário. Atualizar as métricas da tela de Visão Geral (Dashboard).

## 2. Estrutura de Banco de Dados (Sequelize)
Certifique-se de criar ou atualizar os modelos:
- `SystemFeature`: `id`, `slug` (ex: 'swagger-visual', 'xml-generator'), `name`, `is_active` (boolean).
- Seeder inicial: Alimentar a tabela com as ferramentas existentes.
- Relacionamentos:
  * `Plan` belongsToMany `SystemFeature` através de `PlanFeature`.
  * `User` belongsToMany `SystemFeature` através de `UserFeature` (para vendas avulsas).

## 3. Segurança e Middleware (`toolAccess`)
- O middleware de rota deve verificar:
  1. Se a feature está ativa globalmente em `SystemFeature`.
  2. Se o plano atual do usuário (`user.plan_id`) possui essa feature associada OU se o usuário possui um registro válido na tabela `UserFeature` (add-on individual).

## 4. Métricas da Visão Geral (`src/controllers/dashboardController.js`)
- Corrigir os seletores de contagem da tela de Visão Geral para refletir a quantidade de ferramentas cadastradas, usuários ativos por plano e logs do sistema em tempo real.