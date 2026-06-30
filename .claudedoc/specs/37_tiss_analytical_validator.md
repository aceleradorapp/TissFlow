# Especificação Técnica: Validador Analítico TISS & API Endpoint

## 1. Objetivo
Implementar o motor e a interface do Validador Analítico TISS, capaz de processar arquivos XML, analisar a estrutura XSD, recalcular a integridade do Hash MD5, auditar regras semânticas de guias/procedimentos e gerar relatórios executivos em tela e exportação em PDF. Adicionalmente, estruturar a base do endpoint de API pública (bloqueado temporariamente).

## 2. Arquitetura de API e Back-end

### 2.1. Endpoint Público (Futura API integration)
- Criar a rota `POST /api/v1/public/validate`.
- O endpoint deve receber um arquivo XML via `multipart/form-data`.
- **Regra de Bloqueio Provisório:** Injetar um middleware que retorna `403 Forbidden` com o JSON: `{ "error": "API_ACCESS_LOCKED", "message": "O acesso via API está disponível apenas para planos corporativos com chaves integradas. Gerencie suas chaves no painel (Em breve)." }`.

### 2.2. Lógica do Motor de Validação (Backend Service)
- **XSD Matcher:** Validar a conformidade estrutural contra os schemas da ANS gravados no sistema.
- **Hash Engine (MD5):** Extrair o bloco de transação, concatenar strings brutas, calcular o hash MD5 e validar contra a tag `<ans:hash>`. Se divergir, emitir o erro `hash-integrity-validation`.
- **Auditoria de Guias:** Verificar matematicamente os procedimentos (Qtd * Valor = Total) e consistência das somas das guias. Mapar status: `Aprovado`, `Falhou`, `Não Disponível` (tags opcionais ausentes).

## 3. Interface do Usuário (UI/UX) - Conforme image_8d439d.png
- **Área de Entrada:** Drag-and-drop limpo e responsivo para upload de arquivos XML.
- **Card de Resultado Geral (Se inválido):** Borda vermelha suave, cabeçalho indicando o número de erros e lista resumida de metadados extraídos (Arquivo, Versão detectada, Número do Lote, Operadora, Tipo de guias, Total de guias e Valor total informado).
- **Tabela de Detalhes:** Colunas claras (Código, Descrição, Quantidade) listando as quebras de regras com alto contraste e acessibilidade visual em conformidade com o `system_rules.md`.
- **Exportação:** Botão "Baixar Relatório" que emite a estrutura detalhada de validação em formato PDF.