# Especificação Técnica: Persistência de Tema e Refatoração do Modo Claro nas Ferramentas

## 1. Objetivo
Garantir que a escolha de tema (Claro/Escuro) seja salva no navegador e corrigir as cores quebradas das ferramentas TISS (Swagger e Gerador) no modo claro, aplicando a herança correta de backgrounds e textos adaptativos.

## 2. Persistência de Tema (Frontend - Contexto ou Hook de Tema)
- Injetar no mecanismo de troca de tema a gravação e leitura via `localStorage.setItem('tissflow_theme', theme)`.
- Garantir que a inicialização do app leia esta chave para evitar flashes visuais de troca de cor ao recarregar a página.

## 3. Ajustes de Cores das Ferramentas TISS (`SwaggerVisual` e `TissGenerator`)
Substituir backgrounds e bordas hardcoded (fixos) por classes utilitárias semânticas do Tailwind que alternam dependendo do tema:

### 3.1. Painel Central (Árvore) e Input de Busca
- **Fundo do Painel:** Mudar de cor escura fixa para `bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800`.
- **Nós da Árvore:** Garantir que os nomes das tags usem `text-slate-800 dark:text-slate-100`. Os nós opcionais e excluídos devem reduzir opacidade de forma limpa (`opacity-60`).

### 3.2. Painel Lateral Direito (Inspeção)
- **Fundo do Painel:** Alterar para `bg-slate-50 dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800`.
- **Cards Internos (Tipo de Dado/Ocorrências):** Mudar para `bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800`.
- **Textos de Propriedades:** Manatê-los visíveis! `text-slate-700 dark:text-slate-300` para descrições gerais. O Laranja/Âmbar (`text-amber-500`) deve ser mantido em ambos os temas para destacar as restrições com alto contraste.