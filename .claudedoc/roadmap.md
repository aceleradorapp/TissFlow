# Roadmap de Desenvolvimento - TISSflow

Este documento lista as etapas ordenadas de desenvolvimento. Cada subtarefa deve ser concluída e testada antes de avançar para a próxima.

## FASE 1: Estrutura Inicial & Core do Back-end (Node.js + Sequelize)
- [x] Etapa 1.1: Inicialização do projeto, criação das pastas `backend/` e `frontend/`, setup do Express e variáveis de ambiente.
- [x] Etapa 1.2: Instalação e configuração do Sequelize + MySQL (config/database, inicialização da CLI).
- [x] Etapa 1.3: Criação das Migrations e Models iniciais (`roles`, `plans`, `tools`).
- [x] Etapa 1.4: Criação da Migration e Model de `users` (com relacionamentos e senhas com bcrypt).
- [x] Etapa 1.5: Seeders iniciais (inserção de dados padrão como os planos e o usuário Admin).

## FASE 2: Autenticação & Painel Administrativo (Back-end)
- [x] Etapa 2.1: Rotas de Autenticação (Registro de usuário, Login com JWT e Renovação de Token).
- [x] Etapa 2.2: Fluxo de Recuperação de Senha (geração e validação de tokens seguros).
- [x] Etapa 2.3: Middlewares de segurança (validador de token JWT e controle de nível de acesso: Admin/User).
- [x] Etapa 2.4: Rotas Administrativas (listar, ativar, desativar usuários e resetar senhas pelo admin).
- [x] Etapa 2.5: Rotas de Controle de Ferramentas (Admin associar ferramentas a planos).

## FASE 3: Interface do Usuário (Front-end - React)
- [x] Etapa 3.1: Setup do React com Vite, Tailwind CSS e roteamento básico (React Router).
- [x] Etapa 3.2: Criação dos componentes base reutilizáveis (Inputs, Botões, Cards) seguindo a UI definida.
- [x] Etapa 3.3: Telas Públicas (Landing Page explicativa, Login, Cadastro e Recuperação de Senha) integradas ao back-end.
- [x] Etapa 3.4: Painel do Usuário (Dashboard principal exibindo as ferramentas disponíveis de acordo com o plano).
- [x] Etapa 3.5: Painel Administrativo (Interface para gerenciamento de usuários e controle de acessos).

## FASE 4: TISS Core Schema Engine (O Motor e Ingestão Administrativa)
- [x] Etapa 4.1: Modelagem e Criação do Banco de Metadados (Migrations e Models para tiss_versions, tiss_types, tiss_fields e tiss_enums).
- [x] Etapa 4.2: Upload de Multiplos XSD (Endpoint back-end protegido por role(['proprietario']) e tela de upload no painel do Admin).
- [x] Etapa 4.3: O Motor Parser XSD (Desenvolvimento da biblioteca/componente independente capaz de ler os esquemas XML da ANS, extrair tipos, documentações, hierarquias XPath, regex/patterns, salvando tudo no banco de metadados).

## FASE 5: Ferramentas Modulares para Desenvolvedores (Dev Tools)
- [x] Etapa 5.1: Swagger Visual TISS (Navegação completa em árvore com alto contraste e acessibilidade revisada nos modos claro e escuro).
- [ ] Etapa 5.2: Comparador Estático de Versões (Geração de histórico de alterações de tags, tamanhos e tipos persistados no banco durante o upload do XSD).
- [ ] Etapa 5.3: Gerador Automático de XML Amostra e Exportador de Classes (Geração de arquivos estruturados em .NET, TypeScript, Java, Delphi via metadados).
- [ ] Etapa 5.4: API Pública de Metadados (Abertura de endpoints via API Token para sistemas de terceiros).

## FASE 6: Central de Engenharia, Validação e Nuvem (User Tools)
- [ ] Etapa 6.1: Motor de Validação Isolado por Tipo de Transação (Resolução estrita de caminhos e validações lógicas de escolha de tags).
- [ ] Etapa 6.2: IDE Interativa Split-Screen (Blocos vivos coloridos com injeção de campos obrigatórios ausentes, inputs dinâmicos e Monaco Editor).
- [ ] Etapa 6.3: Nuvem TISSflow Multi-tenant (Modal de salvamento estruturado com título, descrição, erros e data de modificação).

## FASE 7: Inteligência Artificial e Auditoria Avançada
- [ ] Etapa 7.1: Copilot TISS Contextual (Integração de LLM via RAG conectada à base de metadados para suporte ao desenvolvedor e faturista).







## FASE 5: Ferramentas Modulares para Desenvolvedores (Dev Tools)
- [x] Etapa 5.1: Swagger Visual TISS (Interface interativa em árvore para navegação completa na estrutura das guias: ex: SP/SADT -> dadosBeneficiario). ← EM DESENVOLVIMENTO
- [ ] Etapa 5.2: Comparador Analítico de Versões (Engine de cruzamento que calcula adições, remoções e mudanças de tipos ou obrigatoriedades entre duas versões).
- [ ] Etapa 5.3: Geradores de Código e XML Amostra (Geração automática de XML fictício 100% válido por guia e exportação de classes em .NET, Node, Java).
- [ ] Etapa 5.4: API Pública de Consulta de Metadados (Abertura de endpoints protegidos por API Token para sistemas legados consultarem os schemas dinamicamente).

## FASE 6: Inteligência e Validador de Guias (Faturamento & Suporte)
- [ ] Etapa 6.1: Validador Inteligente Baseado em Metadados (Motor que recebe o XML do usuário, detecta a versão automaticamente e valida todas as tags contra as regras e restrições do banco de metadados, retornando o XPath exato dos erros).
- [ ] Etapa 6.2: Copilot TISS (Integração de IA contextualizada com o banco de metadados para responder dúvidas técnicas dos devs e propor soluções de faturamento).
- [ ] Etapa 6.3: Painel de Logs e Rastreamento de Erros (Mapeamento e tela futura para visualização de logs operacionais e falhas do ecossistema).

Substitua e salve o arquivo roadmap.md. Quando concluir, me avise para iniciarmos a Etapa 4.1 criando o banco de dados do Core Schema Engine!