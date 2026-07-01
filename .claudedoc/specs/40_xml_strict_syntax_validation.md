# Especificação Técnica: Validação Estrita de Sintaxe e Schema TISS (Strict Mode)

## 1. Objetivo
Garantir que falhas de malformação de tags (mismatched tags) e elementos fora do padrão oficial da ANS (XSD) rejeitem sumariamente o arquivo na Camada 1 do Validador.

## 2. Implementação no Motor (`tissValidatorService.js`)
- **Strict Parsing:** Antes de extrair dados ou calcular hashes, o arquivo XML bruto DEVE passar por uma validação nativa de sintaxe (ex: utilizando o método `XMLValidator.validate()` do pacote `fast-xml-parser` ou habilitando a flag de `strict: true` na biblioteca de parsing).
- **Tratamento de Mismatched Tags:** Se uma tag de abertura (ex: `<ans:CNPJs>`) não casar com a de fechamento (ex: `</ans:CNPJ>`), o parser deve capturar o erro exato, a linha do erro, e interromper o processo imediatamente.
- **Veredito:** O status da validação `xsd-schema-validation` deve mudar para **Falhou**, listando o erro estrutural de sintaxe na tabela de detalhes com prioridade máxima.