# Especificação Técnica: Smart XML Editor (Remediação Assistida)

## 1. Objetivo
Implementar uma interface de edição visual baseada em formulários hierárquicos (blocos) que permita a correção interativa de arquivos XML TISS com falhas, oferecendo ferramentas de assistência (recalculador de hash, busca de tags e badges de dicas de erro) e fluxo de revalidação automática.

## 2. Engenharia de Fluxo (UX)
1. **Origem:** Na tela `TissValidator`, se o arquivo for inválido, exibe o botão `👁️ Visualizar e Corrigir de Forma Amigável`.
2. **Edição:** Redireciona para `/tools/tiss-validator/editor`. Carrega a árvore do XML desestruturada em componentes de input controlados.
3. **Mapeamento de Erros:** O array de erros gerado pelo backend na validação inicial deve ser passado para o editor para injetar os ícones de alerta (`lucide/AlertCircle`) e os textos de ajuda exatamente abaixo dos inputs afetados.
4. **Destino:** Ao clicar em `Salvar e Revalidar`, o frontend reconstrói a string XML, envia de volta ao endpoint de validação e exibe a tela do validador atualizada.

## 3. Componentes de UI (Modo Escuro & Claro)
- **Cards Hierárquicos:** `bg-slate-900/50 border border-slate-800` com identação progressiva para nós filhos.
- **Destaque de Erros:** Inputs afetados recebem as classes `border-red-500/50 focus:ring-red-500/30 bg-red-500/5`.
- **Botão Hash:** Botão com efeito glow na cor violeta/cyan com a ação automática de gerar o MD5 correto do bloco `<prestadorParaOperadora>`.