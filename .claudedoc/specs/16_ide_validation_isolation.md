# Especificação de Refinamento: Isolamento de Choice e Caminhos de Transação no Validador

## 1. Objetivo
Corrigir a avalanche de erros falsos na IDE, fazendo com que o motor de validação siga estritamente o tipo de transação detectado e resolva corretamente os blocos de escolha (`<choice>`) como CNPJ vs CPF.

## 2. Ajustes de Lógica no Backend (`ideService.js`)

### 2.1. Filtro de Caminho por Tipo de Transação
- Ao detectar `tipoTransacao === 'ENVIO_LOTE_GUIAS'`, o motor deve podar a árvore de validação. É proibido validar ou exigir blocos contidos em `operadoraParaPrestador` ou outros filhos de `prestadorParaOperadora` que não sejam `loteGuias`.
- Se o elemento mapeado no XSD não fizer parte do fluxo da transação ativa, o backend não deve incluí-lo no JSON de resposta.

### 2.2. Resolução Logica de `<choice>` (Ex: CNPJ ou CPF)
- Implementar a validação condicional para estruturas de escolha. Se o XSD indicar um bloco `<xs:choice>` contendo CNPJ e CPF, e o XML possuir o CNPJ preenchido com sucesso:
  * Considerar o nó pai como VÁLIDO (Verde).
  * Omitir ou marcar como sucesso os outros ramos alternativos (CPF), eliminando o aviso de "obrigatório, ausente".

## 3. Ajustes de UI (Frontend)
- A árvore da esquerda deve renderizar apenas os blocos que passaram pelo filtro do backend. Se o XML é de Lote de Guias, o bloco `operadoraParaPrestador` não deve sequer ser montado na tela.