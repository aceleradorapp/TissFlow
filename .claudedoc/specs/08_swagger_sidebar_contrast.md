# Especificação de UI/UX: Correção de Alto Contraste e Legibilidade no Painel de Propriedades

## 1. Objetivo
Aumentar drasticamente o contraste e o tamanho da fonte do painel direito de inspeção do Swagger TISS, aplicando uma paleta de cores vibrantes (Laranja/Âmbar) nos metadados técnicos para garantir leitura rápida sem esforço visual.

## 2. Alterações de Interface (Tailwind CSS)

### 2.1. Cards de Propriedades ("Tipo de Dado" e "Ocorrências")
- **Títulos dos Cards ("TIPO DE DADO", "OCORRÊNCIAS"):** Mudar de cinza apagado para `text-slate-400 text-xs font-semibold uppercase tracking-wider`.
- **Valores Principais ("Texto", "Mín: 1"):** Aumentar o tamanho para `text-lg` ou `text-xl` e aplicar a cor **Laranja/Âmbar Neon** (`text-amber-500` ou `text-orange-400`).
- **Subtextos de Herança/Labels ("texto14", "herda string"):** Eliminar o cinza invisível. Aplicar `text-slate-200 text-sm font-medium` para que o texto fique nitidamente legível sobre o fundo escuro.

### 2.2. Tags Gerais do Painel
- Garantir que a tag de tipo de herança base (ex: `herda string`) saia do escuro profundo e use um layout sutil de tag: `bg-slate-900 border border-slate-800 text-amber-400 px-2 py-0.5 rounded text-xs inline-block mt-1 font-mono`.