# Especificação Técnica: Mapeamento Completo de Dados da Guia TISS (Parse e UI)

## 1. Objetivo
Garantir que 100% dos dados relevantes contidos no XML da Guia SP/SADT sejam extraídos pelo parser do backend e exibidos de forma inteligente, densa e organizada na Ficha Humanizada (UI).

## 2. Refatoração do Backend (`viewerService.js` ou Parser XML)
O parser deve mapear e retornar ao front-end as seguintes propriedades (focando em `guiaSP-SADT`):
- **Autorização:** `dadosAutorizacao` (numeroGuiaOperadora, dataAutorizacao, senha).
- **Beneficiário:** Incluir `atendimentoRN`.
- **Atendimento:** Extrair `tipoAtendimento`, `indicacaoAcidente`, `tipoConsulta`, `regimeAtendimento`.
- **Prestador Executante:** Corrigir a extração de `dadosExecutante` (código na operadora, CNES).
- **Procedimentos (`procedimentosExecutados`):** Adicionar `dataExecucao`, `horaInicial`, `horaFinal`, e o nó filho `equipeSadt` (nomeProf, conselho, numeroConselhoProfissional, UF, CBOS).
- **Outras Despesas (`outrasDespesas > despesa > servicosExecutados`):** Corrigir o bug de leitura. Extrair descricaoProcedimento, quantidadeExecutada, valorUnitario, valorTotal, registroANVISA.
- **Observacao:** Extrair tag `<ans:observacao>`.
- **Valores (`valorTotal`):** Extrair o breakdown financeiro (valorProcedimentos, valorTaxasAlugueis, valorMedicamentos, valorTotalGeral).

## 3. Refatoração do Frontend (`GuiaDetails.jsx` ou similar)
- **Cabeçalho:** Adicionar informações de Senha e Autorização.
- **Grids Internos:** Modificar os conteúdos dos Accordions para usar `grid grid-cols-2 md:grid-cols-3 gap-4` para exibir dados de Atendimento e Beneficiário sem desperdiçar espaço vertical.
- **Tabela de Despesas:** Corrigir a renderização para iterar corretamente sobre o array de despesas mapeado no backend.
- **Bloco de Totais e Observações:** Criar um Accordion final (ou card fixo de rodapé) contendo os subtotais financeiros e o texto de Observação em um container de destaque (`bg-slate-800/50 p-3 rounded`).