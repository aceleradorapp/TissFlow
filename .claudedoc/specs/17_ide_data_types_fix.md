# Especificação de Refinamento: Tratamento de Tipos Primitivos e Zeros à Esquerda

## 1. Objetivo
Corrigir o erro crítico de validação que remove zeros à esquerda de CNPJ, CPF e números de carteira, forçando o interpretador a tratar campos de identificação estritamente como Strings.

## 2. Ajustes no Backend (`ideService.js` / Parser)
- **Configuração do fast-xml-parser:** Ao instanciar o parser, desativar a conversão automática global de strings para números se o campo for um identificador.
- **Dicionário de Exceções de Tipo:** Criar uma lista explícita de tags que devem ser tratadas como texto puro:
  `['CNPJ', 'CPF', 'numeroCarteira', 'registroANS', 'senha', 'CNES', 'codigoPrestadorNaOperadora']`.
- Garantir que a validação de regex `[0-9]{14}` seja feita sobre a string original de 14 caracteres (mantendo o zero inicial).