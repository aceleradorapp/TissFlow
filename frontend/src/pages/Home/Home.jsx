import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Stethoscope, Sun, Moon, ArrowRight, Check, Menu, X, Zap,
  Code2, Terminal, Layers, Cpu,
  ShieldCheck, Activity, BarChart3,
} from 'lucide-react';
import api from '../../services/api';

// ─── Grid pattern (inline style) ─────────────────────────────────────────────

const mkGrid = (dark) => ({
  backgroundImage: dark
    ? 'linear-gradient(to right,rgba(30,41,59,.9) 1px,transparent 1px),' +
      'linear-gradient(to bottom,rgba(30,41,59,.9) 1px,transparent 1px)'
    : 'linear-gradient(to right,rgba(226,232,240,.7) 1px,transparent 1px),' +
      'linear-gradient(to bottom,rgba(226,232,240,.7) 1px,transparent 1px)',
  backgroundSize: '60px 60px',
});

// ─── Code-preview data ────────────────────────────────────────────────────────

const CODE_STAGES = [
  {
    filename: 'guia-sadt.xml',
    badge: null,
    dur: 3800,
    lines: [
      ['text-slate-600', '// mensagem TISS 3.05.00'],
      ['text-blue-400',  '<ans:mensagemTISS>'],
      ['text-slate-500', '  <ans:cabecalho>'],
      ['text-slate-400', '    <ans:versaoTISS>'],
      ['text-emerald-400', '      3.05.00'],
      ['text-slate-400', '    </ans:versaoTISS>'],
      ['text-purple-400', '    <ans:tipoTransacao>'],
      ['text-yellow-400', '      ENVIO_LOTE_GUIAS'],
      ['text-purple-400', '    </ans:tipoTransacao>'],
      ['text-slate-500', '  </ans:cabecalho>'],
      ['text-blue-400',  '</ans:mensagemTISS>'],
    ],
  },
  {
    filename: 'terminal',
    badge: { text: 'processando', color: 'text-yellow-400', dot: 'bg-yellow-400' },
    dur: 2600,
    lines: [
      ['text-slate-500',  '$ tissflow validate guia-sadt.xml'],
      ['text-slate-700',  ' '],
      ['text-yellow-400', '  ◆ Carregando XSD ANS 3.05...'],
      ['text-yellow-400', '  ◆ Verificando namespaces...'],
      ['text-yellow-400', '  ◆ Analisando estrutura...'],
      ['text-slate-600',  '  ┄┄ aguardando resultado ┄┄'],
    ],
  },
  {
    filename: 'resultado.json',
    badge: { text: '✓ válido', color: 'text-emerald-400', dot: 'bg-emerald-400' },
    dur: 4000,
    lines: [
      ['text-slate-300',   '{'],
      ['text-blue-400',    '  "status":   "valid",'],
      ['text-emerald-400', '  "versao":   "3.05.00",'],
      ['text-slate-400',   '  "erros":    [],'],
      ['text-purple-400',  '  "avisos":   0,'],
      ['text-yellow-400',  '  "tempo":    "42ms",'],
      ['text-emerald-300', '  "codigo":   200'],
      ['text-slate-300',   '}'],
    ],
  },
];

// ─── Section data ─────────────────────────────────────────────────────────────

const DEV_FEATURES = [
  {
    icon: Code2,
    title: 'Documentação Interativa',
    description: 'Navegue pelos schemas TISS com exemplos prontos em XML, JSON e cURL. Copie e cole direto no seu projeto.',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 dark:bg-blue-500/10',
    hover: 'hover:border-blue-500/50 dark:hover:border-blue-500/40',
  },
  {
    icon: Terminal,
    title: 'Parser & Conversor XML',
    description: 'Converta mensagens TISS entre XML e JSON estruturado, ou gere payloads de teste automaticamente via API REST.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    hover: 'hover:border-emerald-500/50 dark:hover:border-emerald-500/40',
  },
  {
    icon: Layers,
    title: 'Comparador de Layouts',
    description: 'Diff visual entre versões TISS 3.03/3.04/3.05 com highlight de campos adicionados, alterados ou removidos.',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    hover: 'hover:border-purple-500/50 dark:hover:border-purple-500/40',
  },
  {
    icon: Cpu,
    title: 'Geração de Schemas',
    description: 'Exporte tipagens TypeScript, interfaces Go ou modelos Python gerados diretamente a partir dos XSDs da ANS.',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    hover: 'hover:border-yellow-500/50 dark:hover:border-yellow-500/40',
  },
];

const PRESTADOR_FEATURES = [
  {
    icon: ShieldCheck,
    title: 'Validador Inteligente',
    description: 'Valide guias TISS antes do envio e elimine glosas por campos obrigatórios ausentes ou preenchidos incorretamente.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    hover: 'hover:border-emerald-500/50 dark:hover:border-emerald-500/40',
  },
  {
    icon: Activity,
    title: 'Decodificador de Rejeições',
    description: 'Transforme os códigos de rejeição da ANS em linguagem clara, com a causa exata e o passo a passo de correção.',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    hover: 'hover:border-blue-500/50 dark:hover:border-blue-500/40',
  },
  {
    icon: BarChart3,
    title: 'Painel de Faturamento',
    description: 'Visão consolidada de todas as guias: status de retorno, valor em aberto, histórico e exportação para Excel.',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    hover: 'hover:border-purple-500/50 dark:hover:border-purple-500/40',
  },
  {
    icon: Zap,
    title: 'Alertas em Tempo Real',
    description: 'Receba notificações imediatas sobre inconsistências nos lotes enviados antes que eles causem devoluções.',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    hover: 'hover:border-yellow-500/50 dark:hover:border-yellow-500/40',
  },
];

// Static marketing copy per plan name (price and tools come from the API)
const PLAN_DESCRIPTIONS = {
  Bronze: 'Módulo essencial para validação em clínicas e consultórios.',
  Prata:  'Ecossistema completo para devs e equipes de faturamento.',
  Ouro:   'Infraestrutura TISS enterprise para operadoras e redes.',
};

const STATS = [
  { value: '3.05', label: 'TISS / ANS' },
  { value: '< 50ms', label: 'Latência API' },
  { value: '99.9%', label: 'Uptime SLA' },
  { value: 'LGPD', label: 'Compliant' },
];

const TABS = [
  { key: 'dev',       label: 'Para Devs & Tech Leads', icon: Code2 },
  { key: 'prestador', label: 'Para Prestadores',        icon: Activity },
];

// ─── CodePreviewCard ──────────────────────────────────────────────────────────

function CodePreviewCard() {
  const [idx,    setIdx]    = useState(0);
  const [fading, setFading] = useState(false);
  const stage = CODE_STAGES[idx];

  useEffect(() => {
    const t = setTimeout(() => {
      setFading(true);
      setTimeout(() => {
        setIdx((i) => (i + 1) % CODE_STAGES.length);
        setFading(false);
      }, 320);
    }, stage.dur);
    return () => clearTimeout(t);
  }, [idx, stage.dur]);

  return (
    <div className="relative rounded-2xl overflow-hidden
                    bg-slate-950 border border-slate-800/70
                    shadow-2xl shadow-black/50
                    ring-1 ring-white/5
                    hover:ring-blue-500/20 transition-all duration-500">

      {/* Window chrome */}
      <div className="flex items-center gap-2 px-4 py-3.5
                      bg-slate-900/90 border-b border-slate-800/60">
        <div className="flex gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-500/80" />
          <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
        </div>
        <span className="ml-3 flex-1 text-xs font-mono text-slate-500 select-none">
          {stage.filename}
        </span>
        {stage.badge && (
          <span className={`flex items-center gap-1.5 text-xs font-mono ${stage.badge.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${stage.badge.dot} animate-pulse`} />
            {stage.badge.text}
          </span>
        )}
      </div>

      {/* Code body */}
      <div className={`p-5 font-mono text-sm leading-[1.75] min-h-[220px]
                       transition-opacity duration-300
                       ${fading ? 'opacity-0' : 'opacity-100'}`}>
        {stage.lines.map(([color, text], i) => (
          <div key={i} className={color}>{text || ' '}</div>
        ))}
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-2.5
                      bg-slate-900/60 border-t border-slate-800/40
                      text-xs font-mono text-slate-600">
        <span>TISSflow SDK v1.0</span>
        <span>UTF-8 · TISS · ANS</span>
      </div>

      {/* Corner gradient glow */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl
                      bg-gradient-to-br from-blue-500/5 via-transparent to-emerald-500/5" />
    </div>
  );
}

// ─── PlanContent ──────────────────────────────────────────────────────────────

function PlanContent({ plan, featured = false }) {
  const formattedPrice = Number(plan.price).toFixed(2).replace('.', ',');
  const description    = PLAN_DESCRIPTIONS[plan.name] ?? 'Ferramentas avançadas para o ecossistema TISS.';
  const tools          = plan.tools ?? [];

  return (
    <div className="flex flex-col h-full gap-5">
      <div>
        <h3 className={`text-2xl font-extrabold mb-1.5 ${
          featured
            ? 'bg-gradient-to-r from-blue-600 to-emerald-500 dark:from-blue-400 dark:to-emerald-400 bg-clip-text text-transparent'
            : 'text-slate-900 dark:text-slate-50'
        }`}>
          {plan.name}
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          {description}
        </p>
      </div>

      <div className="flex items-end gap-1">
        <span className="text-sm text-slate-400 dark:text-slate-500 pb-0.5">R$</span>
        <span className="text-4xl font-extrabold text-slate-900 dark:text-slate-50 leading-none">
          {formattedPrice}
        </span>
        <span className="text-sm text-slate-400 dark:text-slate-500 pb-0.5">/mês</span>
      </div>

      <ul className="flex flex-col gap-2.5 flex-1">
        {tools.length > 0 ? tools.map((tool) => (
          <li key={tool.id} className="flex items-start gap-2.5">
            <Check
              size={15}
              className={`shrink-0 mt-0.5 ${featured ? 'text-emerald-500' : 'text-slate-400 dark:text-slate-600'}`}
            />
            <span className="text-sm text-slate-600 dark:text-slate-400 leading-snug">{tool.name}</span>
          </li>
        )) : (
          <li className="text-xs text-slate-400 italic">Ferramentas a configurar pelo administrador.</li>
        )}
      </ul>

      <Link
        to="/register"
        className={`mt-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl
                   font-semibold text-sm transition-all duration-300 hover:scale-[1.02] ${
          featured
            ? 'bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-700 hover:to-emerald-600 dark:from-blue-500 dark:to-emerald-400 text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40'
            : 'border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-500 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400'
        }`}
      >
        Começar no {plan.name}
      </Link>
    </div>
  );
}

// ─── Home ────────────────────────────────────────────────────────────────────

export default function Home() {
  const [isDark,      setIsDark]      = useState(() => document.documentElement.classList.contains('dark'));
  const [mobileMenu,  setMobileMenu]  = useState(false);
  const [activeTab,   setActiveTab]   = useState('dev');
  const [plans,       setPlans]       = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  useEffect(() => {
    api.get('/public/plans')
      .then(({ data }) => setPlans(data.plans ?? []))
      .catch(() => {})
      .finally(() => setLoadingPlans(false));
  }, []);

  function toggleDark() {
    document.documentElement.classList.toggle('dark');
    setIsDark((d) => !d);
  }

  const tabFeatures = activeTab === 'dev' ? DEV_FEATURES : PRESTADOR_FEATURES;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300 overflow-x-hidden">

      {/* ── Navbar ───────────────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 w-full z-50
                         border-b border-slate-900
                         bg-slate-950/70 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">

          <div className="flex items-center gap-2.5">
            <Stethoscope className="text-blue-600 dark:text-blue-400" size={20} />
            <span className="font-bold text-lg text-slate-900 dark:text-slate-50 tracking-tight">
              TISSflow
            </span>
          </div>

          {/* Desktop */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={toggleDark}
              className="p-2 rounded-lg text-slate-500 dark:text-slate-400
                         hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
            >
              {isDark ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <Link
              to="/login"
              className="px-4 py-2 rounded-xl text-sm font-medium
                         text-slate-600 dark:text-slate-400
                         hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
            >
              Entrar
            </Link>
            <Link
              to="/register"
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white
                         bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600
                         shadow-sm hover:shadow-md hover:shadow-blue-500/30 transition-all duration-200"
            >
              Criar conta
            </Link>
          </div>

          {/* Mobile */}
          <div className="flex sm:hidden items-center gap-1">
            <button
              onClick={toggleDark}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            >
              {isDark ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <button
              onClick={() => setMobileMenu((v) => !v)}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            >
              {mobileMenu ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {mobileMenu && (
          <div className="sm:hidden border-t border-slate-200 dark:border-slate-800
                          bg-white dark:bg-slate-950 px-4 py-4 flex flex-col gap-2">
            <Link
              to="/login"
              onClick={() => setMobileMenu(false)}
              className="px-4 py-3 rounded-xl text-sm font-medium text-center
                         text-slate-700 dark:text-slate-300
                         hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            >
              Entrar
            </Link>
            <Link
              to="/register"
              onClick={() => setMobileMenu(false)}
              className="px-4 py-3 rounded-xl text-sm font-semibold text-center text-white
                         bg-blue-600 hover:bg-blue-700 transition-all"
            >
              Criar conta gratuitamente
            </Link>
          </div>
        )}
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-36 pb-20 sm:pt-44 sm:pb-28 lg:pt-52 lg:pb-36">

        {/* Grid */}
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
          style={mkGrid(isDark)}
        />

        {/* Floating orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div
            className="animate-float absolute -top-56 -left-56 w-[700px] h-[700px]
                        rounded-full bg-blue-500/10 dark:bg-blue-500/7 blur-3xl"
          />
          <div
            className="animate-float-alt absolute -bottom-56 -right-40 w-[640px] h-[640px]
                        rounded-full bg-emerald-500/10 dark:bg-emerald-500/6 blur-3xl"
          />
          <div
            className="animate-float absolute top-1/3 left-1/2 w-[440px] h-[440px]
                        rounded-full bg-purple-500/7 dark:bg-purple-500/5 blur-3xl"
            style={{ animationDelay: '-10s' }}
          />
        </div>

        {/* Bottom fade */}
        <div
          className="pointer-events-none absolute bottom-0 inset-x-0 h-40
                      bg-gradient-to-t from-slate-50 dark:from-slate-950 to-transparent"
          aria-hidden="true"
        />

        <div className="relative max-w-6xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-14 lg:gap-20 items-center">

            {/* ─ Left: copy ─ */}
            <div>
              {/* Live badge */}
              <div className="inline-flex items-center gap-2.5 px-4 py-2 mb-8 rounded-full
                              text-xs font-semibold
                              border border-blue-200 dark:border-blue-800/60
                              bg-blue-50/80 dark:bg-blue-900/20
                              text-blue-700 dark:text-blue-300
                              backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                </span>
                Infraestrutura TISS para devs e empresas de saúde
              </div>

              {/* Title */}
              <h1 className="text-4xl sm:text-5xl lg:text-[3.4rem] font-extrabold leading-[1.1] tracking-tight mb-6">
                <span className="text-slate-900 dark:text-slate-50">A infraestrutura</span>
                <br />
                <span className="bg-gradient-to-r from-blue-600 via-blue-500 to-emerald-500
                                 dark:from-blue-400 dark:via-blue-300 dark:to-emerald-400
                                 bg-clip-text text-transparent">
                  TISS definitiva.
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 leading-relaxed mb-8 max-w-xl">
                Ferramentas analíticas e geradores de código para desenvolvedores, somados a validadores
                inteligentes para equipes de faturamento.{' '}
                <span className="text-slate-800 dark:text-slate-200 font-medium">
                  Contrate o ecossistema completo ou pague apenas pelo módulo que usar.
                </span>
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Primary: gradient + shimmer glow */}
                <Link
                  to="/register"
                  className="group relative inline-flex items-center justify-center gap-2.5
                             w-full sm:w-auto px-7 py-4 rounded-xl overflow-hidden
                             font-bold text-sm text-white
                             bg-gradient-to-r from-blue-600 to-blue-500
                             dark:from-blue-500 dark:to-blue-400
                             shadow-lg shadow-blue-500/30
                             hover:shadow-xl hover:shadow-blue-500/50
                             hover:scale-[1.02] transition-all duration-300"
                >
                  {/* shimmer sweep */}
                  <span
                    className="absolute inset-0
                               bg-gradient-to-r from-transparent via-white/20 to-transparent
                               translate-x-[-200%] group-hover:translate-x-[200%]
                               transition-transform duration-700"
                  />
                  <span className="relative">Começar gratuitamente</span>
                  <ArrowRight
                    size={16}
                    className="relative transition-transform duration-300 group-hover:translate-x-1"
                  />
                </Link>

                {/* Secondary: terminal-style */}
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2
                             w-full sm:w-auto px-7 py-4 rounded-xl
                             font-mono font-medium text-sm
                             border border-slate-300 dark:border-slate-700
                             text-slate-600 dark:text-slate-400
                             hover:border-emerald-500 dark:hover:border-emerald-500
                             hover:text-emerald-600 dark:hover:text-emerald-400
                             hover:scale-[1.02] transition-all duration-300"
                >
                  <span className="text-emerald-500 font-bold">$</span> login --token
                </Link>
              </div>

              {/* Stats */}
              <div className="mt-10 pt-8 border-t border-slate-200/60 dark:border-slate-800/60
                              flex flex-wrap gap-x-8 gap-y-3">
                {STATS.map(({ value, label }) => (
                  <div key={label}>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{value}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-500">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ─ Right: Code preview (desktop) ─ */}
            <div className="hidden lg:block">
              <CodePreviewCard />
            </div>
          </div>

          {/* Code preview (mobile) */}
          <div className="mt-12 lg:hidden">
            <CodePreviewCard />
          </div>
        </div>
      </section>

      {/* ── Segmentation: Dev vs Prestador ───────────────────────────────── */}
      <section className="py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4">

          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-50 mb-4">
              Feito para quem constrói{' '}
              <span className="bg-gradient-to-r from-blue-600 to-emerald-500 bg-clip-text text-transparent">
                e para quem opera.
              </span>
            </h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto mb-8">
              Duas audiências, uma plataforma. Escolha o que é relevante para o seu perfil.
            </p>

            {/* Tabs */}
            <div className="inline-flex bg-slate-100 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl p-1 gap-1">
              {TABS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold
                              transition-all duration-200 ${
                    activeTab === key
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  <Icon size={14} className="shrink-0" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Feature cards — key forces remount + fade-slide-in */}
          <div
            key={activeTab}
            className="grid grid-cols-1 sm:grid-cols-2 gap-5 animate-fade-slide-in"
          >
            {tabFeatures.map(({ icon: Icon, title, description, color, bg, hover }) => (
              <div
                key={title}
                className={`group relative overflow-hidden
                            bg-white/60 dark:bg-slate-900/50
                            backdrop-blur-xl
                            border border-slate-200/60 dark:border-slate-700/40
                            rounded-2xl p-6
                            hover:scale-[1.02] hover:shadow-xl
                            transition-all duration-300 cursor-default
                            ${hover}`}
              >
                {/* Glass shine */}
                <div className="pointer-events-none absolute inset-0 rounded-2xl
                                bg-gradient-to-br from-white/40 dark:from-white/3 to-transparent" />
                <div className={`relative w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${bg}`}>
                  <Icon size={20} className={color} />
                </div>
                <h3 className="relative font-semibold text-slate-900 dark:text-slate-50 mb-2">{title}</h3>
                <p className="relative text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Planos Modulares ─────────────────────────────────────────────── */}
      <section className="py-20 sm:py-28 bg-gradient-to-b from-slate-100/80 to-slate-50 dark:from-slate-900/50 dark:to-slate-950">
        <div className="max-w-6xl mx-auto px-4">

          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full
                            border border-blue-200 dark:border-blue-800/60
                            bg-blue-50/80 dark:bg-blue-900/10
                            text-xs font-semibold text-blue-700 dark:text-blue-300">
              <Zap size={12} />
              Pague apenas pelo módulo que precisar — expanda quando quiser
            </div>

            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-50 mb-4">
              Planos Modulares
            </h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
              Sem fidelidade, sem surpresas. Combine os módulos que a sua equipe usa e cancele quando quiser.
            </p>
          </div>

          {loadingPlans ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl p-8 h-72 animate-pulse
                             bg-slate-100 dark:bg-slate-800/40
                             border border-slate-200/60 dark:border-slate-700/40"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:items-stretch">
              {plans.map((plan, idx) => {
                const featured = idx === 1;
                return featured ? (
                  <div key={plan.id} className="relative md:-mt-6">
                    <span className="absolute -top-4 left-1/2 -translate-x-1/2 z-10
                                     px-5 py-1.5 rounded-full text-xs font-bold text-white whitespace-nowrap
                                     bg-gradient-to-r from-blue-600 to-emerald-500
                                     shadow-md shadow-blue-500/30">
                      ⭐ Mais Popular
                    </span>
                    <div className="p-px rounded-2xl h-full
                                    bg-gradient-to-b from-blue-500 via-blue-400 to-emerald-500
                                    shadow-xl shadow-blue-500/20
                                    dark:shadow-[0_0_40px_rgba(59,130,246,0.4),0_0_80px_rgba(16,185,129,0.12)]">
                      <div className="bg-white dark:bg-slate-900 rounded-[15px] p-8 h-full">
                        <PlanContent plan={plan} featured />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    key={plan.id}
                    className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl
                               border border-slate-200/60 dark:border-slate-800/60
                               rounded-2xl p-8 flex flex-col
                               hover:shadow-lg hover:scale-[1.01]
                               transition-all duration-300"
                  >
                    <PlanContent plan={plan} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── CTA final ────────────────────────────────────────────────────── */}
      <section className="py-20 sm:py-28">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="relative overflow-hidden rounded-3xl
                          bg-gradient-to-br from-blue-600 via-blue-700 to-emerald-600
                          dark:from-blue-700 dark:via-blue-800 dark:to-emerald-700
                          p-10 sm:p-16 shadow-2xl shadow-blue-500/30">
            <div className="pointer-events-none absolute -top-20 -right-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" aria-hidden="true" />
            <div className="pointer-events-none absolute -bottom-20 -left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" aria-hidden="true" />
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 leading-tight">
                Comece a construir com TISS hoje.
              </h2>
              <p className="text-blue-100 text-lg mb-8">
                Crie sua conta gratuita, explore a documentação interativa e faça sua primeira validação em menos de 5 minutos.
              </p>
              <Link
                to="/register"
                className="group inline-flex items-center gap-2.5 px-8 py-4 rounded-xl
                           font-bold text-base text-blue-700
                           bg-white hover:bg-blue-50
                           shadow-lg hover:shadow-xl
                           hover:scale-[1.02] transition-all duration-300"
              >
                Criar conta gratuita
                <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-10">
        <div className="max-w-6xl mx-auto px-4
                        flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Stethoscope className="text-blue-600 dark:text-blue-400" size={18} />
            <span className="font-bold text-slate-900 dark:text-slate-50">TISSflow</span>
          </div>
          <p className="text-sm text-slate-400 dark:text-slate-500 text-center">
            © {new Date().getFullYear()} TISSflow. Plataforma SaaS para o ecossistema TISS · ANS.
          </p>
          <div className="flex items-center gap-5 text-sm">
            <Link to="/login"    className="text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Entrar</Link>
            <Link to="/register" className="text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Cadastrar</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
