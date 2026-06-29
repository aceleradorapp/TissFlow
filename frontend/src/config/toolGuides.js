export const TOOL_GUIDES = {
  'swagger-visual': {
    title: 'Swagger Visual TISS',
    description: 'Navegue pela estrutura hierárquica completa do padrão TISS/ANS de forma interativa, com inspeção de campos e busca avançada.',
    steps: [
      'Selecione a versão TISS desejada no painel esquerdo (ex: 4.01.00) para carregar a árvore de schemas.',
      'Clique em qualquer nó da árvore central para expandi-lo e navegar pelos campos filhos. Os pontos coloridos indicam obrigatoriedade.',
      'Use o painel direito para inspecionar detalhes do campo selecionado: tipo, restrições, enumerações e o XPath completo.',
    ],
    proTip: 'Use a barra de busca no topo da árvore para localizar qualquer campo pelo nome — ela destaca todas as ocorrências e auto-expande o caminho hierárquico até o campo encontrado.',
  },
  'xml-generator': {
    title: 'Gerador de Amostras XML/JSON',
    description: 'Gere payloads de teste prontos para uso a partir dos schemas XSD oficiais da ANS, em XML estruturado ou JSON.',
    steps: [
      'Selecione a versão TISS e o tipo de transação (ex: Envio de Lote de Guias) no painel esquerdo.',
      'Marque ou desmarque os campos opcionais na árvore de campos — os campos obrigatórios já vêm pré-selecionados automaticamente.',
      'Clique em "Gerar XML" ou "Gerar JSON" e use o modal de saída para copiar o conteúdo ou baixá-lo como arquivo.',
    ],
    proTip: 'Use "Marcar Todos" para incluir todos os campos opcionais conhecidos na amostra, ou "Desmarcar Todos" para manter apenas os campos obrigatórios do schema.',
  },
  'tiss-viewer': {
    title: 'Visualizador TISS',
    description: 'Interprete XMLs TISS de forma humanizada, exibindo os dados das guias em cards legíveis, com suporte a lotes com múltiplas guias.',
    steps: [
      'Arraste e solte (ou clique para selecionar) um arquivo .xml TISS válido na área de upload.',
      'Aguarde a análise automática — o sistema detecta a versão, o tipo de transação e separa cada guia do lote.',
      'Navegue entre as guias usando a barra superior e expanda as seções para inspecionar os valores de cada campo.',
    ],
    proTip: 'Lotes com múltiplas guias são navegados individualmente com as setas de paginação no topo. O número total de guias detectadas aparece no badge azul ao lado do nome do arquivo.',
  },
  'tiss-ide': {
    title: 'IDE Interativa TISS',
    description: 'Edite XMLs TISS diretamente no navegador com validação em tempo real contra o XSD oficial da ANS e highlight de erros por linha.',
    steps: [
      'Faça upload de um XML TISS existente — o editor exibirá o conteúdo com syntax highlighting e a árvore de estrutura ao lado.',
      'Edite qualquer campo no editor de texto; a árvore de estrutura no painel esquerdo atualiza automaticamente após 1,2 segundos.',
      'O indicador de status na barra superior mostra erros de validação XSD. Use "Baixar XML" para exportar ou "Salvar na Nuvem" para persistir.',
    ],
    proTip: 'Você pode editar pelo editor de texto (painel direito) ou pela árvore de estrutura (painel esquerdo) — ambos ficam sincronizados em tempo real via backend.',
  },
  'version-comparator': {
    title: 'Comparador de Versões TISS',
    description: 'Compare duas versões do padrão TISS lado a lado e visualize todos os campos adicionados, removidos ou modificados com preview XML.',
    steps: [
      'Selecione a versão base (mais antiga) e a versão alvo (mais nova) nos seletores de versão no topo da página.',
      'Use os cards de resumo e os filtros por tipo de guia, tipo de mudança e busca por texto para navegar nas diferenças.',
      'Clique em qualquer linha da tabela para ver o painel De/Para com os valores exatos de cada mudança. O ícone </> abre o preview XML hierárquico.',
    ],
    proTip: 'O botão "Exportar PDF" gera um relatório profissional respeitando todos os filtros ativos — exporta exatamente o que está visível na tela no momento da exportação.',
  },
};
