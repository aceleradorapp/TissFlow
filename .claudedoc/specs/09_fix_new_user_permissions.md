# Especificação Técnica: Correção de Permissões de Recursos e Seeders de Planos

## 1. Objetivo
Garantir que novos usuários consigam listar as versões do TISS caso seu plano possua a ferramenta vinculada, corrigindo falhas de tabelas pivô vazias e ajustando o middleware de validação.

## 2. Implementação e Correção de Banco (Sequelize)
- **Seeder de Vinculação Padrão:** Crie um arquivo de seed para garantir que os planos existentes (ex: Prata, Ouro, ou os planos que você tiver no banco) recebam o vínculo das features `swagger-visual` e `xml-generator` na tabela `plan_features`.
- **Validação de Fallback:** No controller que busca as versões para as ferramentas (`swaggerController`), certifique-se de retornar um erro claro de "Plano não possui acesso" em vez de simplesmente travar a requisição com array vazio se o middleware falhar.