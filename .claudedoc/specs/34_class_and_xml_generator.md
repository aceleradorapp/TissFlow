# Especificação Técnica: Gerador de Modelos XML e Classes Tipadas

## 1. Objetivo
Implementar uma ferramenta interativa no padrão IDE para geração automatizada de payloads XML de exemplo e classes tipadas nas linguagens .NET (C#), TypeScript, Go e Python, baseando-se estritamente nas regras estruturais e de metadados extraídas do XSD da ANS registradas no banco de dados.

## 2. Interface do Usuário (UI/UX) - Conforme watermarked_img_2571690010095092163.png
- **Acessibilidade de Cores (Crucial):** Todos os componentes de texto, nós e declarações de tipos dentro do visualizador de código devem obedecer rigidamente aos níveis de contraste da norma WCAG AA e do arquivo `system_rules.md` (evitar cinzas apagados).
- **Layout de Duas Colunas:**
  - **Painel de Controle (Esquerda):** Dropdowns premium para selecionar Versão TISS e Transação Raiz. Botão dinâmico `💡 Como Usar`. Seletor de abas estilizado para a linguagem alvo (`.NET (C#)`, `TypeScript`, `Go`, `Python`, `XML Modelo`).
  - **Botão de Expansão Futura:** Inserir um botão de destaque na base da barra lateral com o texto: `💡 Carregar Lista Particular (Em breve)`. Este botão deve ter bordas com efeito de brilho suave (glow) e estar desativado (`disabled cursor-not-allowed`).
  - **Visualizador de Código (Direita):** Bloco escuro estilo IDE (`bg-slate-950`) com numeração de linhas, realce de sintaxe de alta visibilidade e botões flutuantes para `📋 Copiar Código` e `💾 Baixar Arquivo`.

## 3. Regras de Compilação de Código (Backend & Frontend)
- **XML Modelo:** Deve montar um arquivo XML estruturado de acordo com a ordem exata dos campos da transação escolhida, injetando valores de exemplo válidos nos tipos primitivos (datas, strings de tamanho fixo, decimais).
- **TypeScript:** Mapear tipos string, number, boolean respeitando o operador de opcionalidade (`?`) para campos não obrigatórios no XSD.
- **.NET (C#):** Gerar classes públicas contendo Data Annotations (`[StringLength]`, `[Required]`) baseadas nas restrições gravadas nas tabelas de metadados.

## 4. Monetização (Ganchos de Vendas)
- Usuários no plano `Free Trial` podem visualizar os códigos em tela normalmente.
- O botão `💾 Baixar Arquivo` deve disparar o `UpgradeModal` caso o usuário esteja no plano Trial.