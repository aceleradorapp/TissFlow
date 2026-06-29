# Especificação Técnica: Gerador Customizado de XML/JSON TISS (V2)

## 1. Objetivo
Criar um gerador de amostras XML/JSON focado na experiência do usuário, onde a árvore gerada é segmentada estritamente pelo Tipo de Transação escolhido, permitindo a exclusão de tags opcionais via checkboxes em cascata e visualização em modal de alto contraste com suporte a code-folding.

## 2. Implementação no Back-end (`src/services/tools/generatorService.js`)
- Criar mapeamento de pontos de entrada baseados no tipo de transação selecionada:
  * `ENVIO_LOTE_GUIAS` -> Focar na árvore abaixo de `prestadorParaOperadora > loteGuias`
  * `ENVIO_RECURSO_GLOSA` -> Focar em `prestadorParaOperadora > recursoGlosa`
  * `SOLICITACAO_ELEGIBILIDADE` -> Focar em `prestadorParaOperadora > solicitacaoElegibilidade`
- O motor deve ignorar as tags cujos caminhos (XPaths) foram desmarcados no payload enviado pelo frontend.

## 3. Implementação no Front-end (`src/pages/Tools/TissGenerator/`)

### 3.1. Filtros Iniciais e Menu
- **Menu Lateral:** Adicionar obrigatoriamente a rota `/tools/generator` no arquivo de rotas/sidebar principal (`src/components/Sidebar.jsx` ou equivalente) com o nome "Gerador de Amostras XML/JSON".
- **Painel de Controle:** - Dropdown 1: Versão TISS.
  - Dropdown 2: Tipo de Transação (Carregar opções dinâmicas ou estáticas estruturadas da TISS).

### 3.2. Árvore de Seleção de Tags
- Renderizar a árvore contextual da transação escolhida.
- Cada nó possui um checkbox funcional. Desmarcar o checkbox de um nó pai aplica visualmente a opacidade `opacity-40` em todos os seus descendentes e os remove da lista de exportação.

### 3.3. Modal de Exibição de Código de Alto Contraste
- O modal deve possuir fundo escuro profundo (`bg-slate-950`), mas com tipografia de código clara e colorida (`text-slate-100` para valores, `text-cyan-400` para tags XML, `text-amber-300` para atributos).
- Integrar funcionalidade de abrir/fechar blocos de tags (Toggle de nós do XML/JSON gerado).
- Incluir botões funcionais de "Copiar para Área de Transferência" e "Baixar Arquivo (.xml / .json)".