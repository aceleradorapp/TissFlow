# Especificação de Refinamento: Mapeamento de Prestadores, Contraste e Painel de Avisos

## 1. Objetivo
Corrigir a omissão de dados dos prestadores, aumentar a legibilidade dos labels por meio de contraste e criar a interface de exibição detalhada para a contagem de avisos estruturais.

## 2. Ajustes Visuais e Funcionais (Frontend)

### 2.1. Renderização de Prestadores e Contraste (`TissViewer` / `GuiaDetails`)
- **Mapeamento:** Extrair e renderizar os dados de `<ans:dadosSolicitante>` e `<ans:dadosExecutante>`. Exibir Nome, Código na Operadora/CNPJ, Conselho Profissional, Número do Conselho, UF e CBO/CBOS.
- **Tipografia:** Mudar a cor de todos os labels descritivos (ex: "Nº Carteira", "Acidente") para `text-slate-300 font-medium text-sm`. Os valores dinâmicos devem usar `text-white font-semibold`.

### 2.2. Interface de Detalhamento de Avisos
- Transformar o badge de avisos do cabeçalho em um elemento interativo.
- Adicionar um bloco fixo expansível no topo da ficha da guia, ou uma gaveta, utilizando classes Tailwind: `bg-amber-500/10 border border-amber-500/30 text-amber-400 p-4 rounded-lg mb-4`.
- Listar individualmente os itens contidos no array de avisos gerado pelo validador do backend.