# Padrões de UI/UX, Estilo e Layout - TISSflow

Este documento define a identidade visual, padrões de design, responsividade e a estrutura de layout do front-end. O Claude deve seguir estas regras estritamente.

## 1. Suporte a Temas (Light & Dark Mode)
A aplicação deve ser construída utilizando a estratégia de classes `dark:` do Tailwind CSS para fácil alternância de tema.

| Elemento | Tema Claro (Light Mode) | Tema Escuro (Dark Mode) |
| :--- | :--- | :--- |
| **Fundo Principal** | `bg-slate-50` | `bg-slate-950` |
| **Superfícies (Cards/Modais)**| `bg-white` | `bg-slate-900` |
| **Bordas** | `border-slate-200` | `border-slate-800` |
| **Texto Principal** | `text-slate-900` | `text-slate-50` |
| **Texto Secundário** | `text-slate-500` | `text-slate-400` |
| **Cor Primária (Saúde)** | `bg-blue-600` (hover:`bg-blue-700`) | `bg-blue-500` (hover:`bg-blue-600`) |
| **Cor Secundária (Sucesso)** | `bg-emerald-500` | `bg-emerald-600` |

## 2. Layout Mestre (Dashboard / Área Logada)
O sistema utilizará um padrão de **Layout de Página Mestre (Master Layout)** altamente responsivo:
- **Header (Topo):** Fixo no topo (`sticky top-0`), sempre visível. A página rola por baixo dele. Contém a troca de tema, alertas e perfil.
- **Sidebar (Menu Lateral Esquerdo):** - Deve ser **retrátil** (recolher/exibir) com uma transição suave.
  - Em **Monitores/Tablets:** Fica fixo ao lado. Quando recolhido, exibe apenas os ícones.
  - Em **Celulares:** Fica oculto por padrão e entra como um menu "gaveta" (drawer) sobreposto ao clicar no menu hambúrguer.

## 3. Elementos Visuais e Animações
- **Ícones:** Utilizar exclusivamente a biblioteca **`lucide-react`** (ícones modernos, limpos e consistentes).
- **Animações:** Utilizar transições suaves do Tailwind (`transition-all duration-300 ease-in-out`) para abertura de menus, hover de botões e troca de tema. Na Landing Page (página inicial), utilizar animações de entrada (como fade-in e subida suave de blocos).
- **Alertas Padrão (Toasts):** Utilizar um padrão de notificações flutuantes (ex: `react-hot-toast` ou `sonner`) para sucesso, erro e avisos, sempre acompanhados de ícones correspondentes.
- **Bordas e Responsividade:** Cantos arredondados modernos (`rounded-xl`). Design 100% focado em **Mobile-First**, garantindo que tudo funcione perfeitamente em telas de 320px até monitores ultra-wide.

## 4. Arquitetura de Arquivos no React (Regra Estrita de Pastas)
Cada componente ou página deve ter sua própria pasta. Nunca misture múltiplos componentes complexos em um único arquivo.

```text
src/components/Button/
├── Button.jsx        # Código do componente
└── index.js          # Exportação limpa