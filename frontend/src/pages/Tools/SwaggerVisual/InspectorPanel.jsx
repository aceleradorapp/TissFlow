import { useState } from 'react';
import {
  Info, ShieldCheck, List, Code2, Copy, Check,
  AlignLeft, Hash, Calendar, Clock, Layers, ToggleLeft, Repeat,
} from 'lucide-react';

// ── Type resolution ───────────────────────────────────────────────────────────

const TYPE_RULES = [
  { match: /bool/i,                                                  label: 'Booleano',  sub: 'boolean',  Icon: ToggleLeft, clr: 'green'  },
  { match: /datetime/i,                                              label: 'Data/Hora', sub: 'dateTime', Icon: Clock,      clr: 'sky'    },
  { match: /^date$/i,                                                label: 'Data',      sub: 'date',     Icon: Calendar,   clr: 'sky'    },
  { match: /time/i,                                                  label: 'Hora',      sub: 'time',     Icon: Clock,      clr: 'sky'    },
  { match: /decimal|float|double/i,                                  label: 'Decimal',   sub: 'decimal',  Icon: Hash,       clr: 'amber'  },
  { match: /int(eger)?$|long$|short$|byte$|positive|negative|nonneg/i, label: 'Inteiro', sub: 'integer', Icon: Hash,       clr: 'orange' },
  { match: /string|token|normalized|name/i,                          label: 'Texto',     sub: 'string',   Icon: AlignLeft,  clr: 'blue'   },
];

const CLR = {
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-300', border: 'border-purple-500/20', icon: 'text-purple-400/60' },
  blue:   { bg: 'bg-blue-500/10',   text: 'text-blue-300',   border: 'border-blue-500/20',   icon: 'text-blue-400/60'   },
  sky:    { bg: 'bg-sky-500/10',    text: 'text-sky-300',    border: 'border-sky-500/20',    icon: 'text-sky-400/60'    },
  orange: { bg: 'bg-orange-500/10', text: 'text-orange-300', border: 'border-orange-500/20', icon: 'text-orange-400/60' },
  amber:  { bg: 'bg-amber-500/10',  text: 'text-amber-300',  border: 'border-amber-500/20',  icon: 'text-amber-400/60'  },
  green:  { bg: 'bg-green-500/10',  text: 'text-green-300',  border: 'border-green-500/20',  icon: 'text-green-400/60'  },
  slate:  { bg: 'bg-slate-200/60 dark:bg-slate-800/40', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-300 dark:border-slate-700/50', icon: 'text-slate-400 dark:text-slate-500' },
};

function resolveTypeMeta(field) {
  if (!field.isLeaf) return { label: 'Estrutura', sub: 'complex', Icon: Layers, clr: 'purple' };
  const raw = (field.restrictions?.base ?? field.type ?? '').replace(/^xs:|^xsd:/i, '');
  for (const rule of TYPE_RULES) {
    if (rule.match.test(raw)) return rule;
  }
  return { label: 'Texto', sub: raw || 'string', Icon: AlignLeft, clr: 'slate' };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function genExampleValue(field) {
  const r = field.restrictions;
  if (r?.enums?.length > 0)  return r.enums[0].value;
  if (r?.pattern)            return r.pattern.replace(/[\[\](){}\\^$|?*+.]/g, '').slice(0, 10) || 'XXXX';
  if (r?.maxLength)          return 'X'.repeat(Math.min(Number(r.maxLength), 12));
  if (r?.totalDigits)        return '0'.repeat(Math.min(Number(r.totalDigits), 10));
  return 'valor';
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PropCard({ icon: Icon, label, accent, children }) {
  const c = CLR[accent] ?? CLR.slate;
  return (
    <div className={`rounded-xl border p-3 flex flex-col gap-2 ${c.bg} ${c.border}`}>
      <div className="flex items-center gap-1.5">
        <Icon size={11} className={c.icon} />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</span>
      </div>
      <div className="text-base font-bold leading-tight text-amber-600 dark:text-amber-400">
        {children}
      </div>
    </div>
  );
}

function SectionLabel({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon size={11} className="text-slate-400 dark:text-slate-500" />
      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{label}</span>
    </div>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium
                 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5
                 border border-transparent hover:border-slate-300 dark:hover:border-slate-700/50 transition-all duration-150"
    >
      {copied
        ? <><Check size={9} className="text-emerald-500" /><span className="text-emerald-500">Copiado</span></>
        : <><Copy size={9} /><span>Copiar</span></>}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function InspectorPanel({ field }) {
  const [codeTab, setCodeTab] = useState('xml');

  if (!field) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6">
        <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-800/60
                        flex items-center justify-center">
          <Info size={18} className="text-slate-400 dark:text-slate-500" />
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Inspetor de Campo</p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">
            Clique em um campo<br />na árvore para inspecionar
          </p>
        </div>
      </div>
    );
  }

  const isRequired  = Number(field.minOccurs ?? '1') >= 1;
  const typeMeta    = resolveTypeMeta(field);
  const typeDisplay = (field.type ?? '').replace(/^(__inline__|ct_|st_)/, '') || typeMeta.sub;
  const r           = field.restrictions;

  const maxOccDisplay  = field.maxOccurs === 'unbounded' ? '∞' : (field.maxOccurs ?? '1');
  const hasLength      = r?.minLength != null || r?.maxLength != null;
  const hasDigits      = r?.totalDigits != null;
  const hasPattern     = !!r?.pattern;
  const hasEnums       = (r?.enums?.length ?? 0) > 0;
  const hasConstraints = hasLength || hasDigits || hasPattern;

  const exValue     = genExampleValue(field);
  const xmlEx       = `<${field.name}>${exValue}</${field.name}>`;
  const jsonEx      = JSON.stringify({ [field.name]: exValue }, null, 2);
  const codeContent = codeTab === 'xml' ? xmlEx : jsonEx;

  return (
    <div className="flex flex-col h-full overflow-y-auto">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="shrink-0 px-4 pt-5 pb-4 border-b border-slate-200 dark:border-slate-800/60 bg-slate-100/40 dark:bg-white/[0.01]">
        <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-white break-words leading-snug mb-3">
          {field.name}
        </h2>
        <span className={[
          'inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-md uppercase tracking-wider border',
          isRequired
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
            : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700',
        ].join(' ')}>
          {isRequired ? 'Obrigatório' : 'Opcional'}
        </span>
      </div>

      {/* ── Body ───────────────────────────────────────────────── */}
      <div className="flex flex-col divide-y divide-slate-200 dark:divide-slate-800/40">

        {/* Property grid */}
        <div className="px-4 py-4">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <PropCard icon={typeMeta.Icon} label="Tipo de Dado" accent={typeMeta.clr}>
              <span className="block">{typeMeta.label}</span>
              <span className="block text-xs font-mono font-medium text-slate-500 dark:text-slate-300 mt-0.5 truncate">
                {typeDisplay}
              </span>
            </PropCard>
            <PropCard icon={Repeat} label="Ocorrências" accent="slate">
              <span className="block">Mín: {field.minOccurs ?? '1'}</span>
              <span className="block">Máx: {maxOccDisplay}</span>
            </PropCard>
          </div>
          {r?.base && (
            <span className="bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-amber-600 dark:text-amber-400
                             px-2 py-0.5 rounded text-xs inline-block mt-1 font-mono">
              herda {r.base}
            </span>
          )}
        </div>

        {/* Description */}
        {field.description && (
          <div className="px-4 py-4">
            <SectionLabel icon={Info} label="Descrição ANS" />
            <p className="text-[12px] text-slate-600 dark:text-slate-400 leading-relaxed">{field.description}</p>
          </div>
        )}

        {/* Restrictions */}
        {hasConstraints && (
          <div className="px-4 py-4">
            <SectionLabel icon={ShieldCheck} label="Restrições" />
            <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50">
              {hasLength && (
                <div className="flex items-center justify-between px-3 py-2.5
                                border-b border-slate-200 dark:border-slate-800/60 last:border-b-0">
                  <span className="text-[11px] text-slate-500">Comprimento</span>
                  <code className="text-[11px] font-mono text-slate-700 dark:text-slate-300 tabular-nums">
                    {r.minLength ?? '0'} — {r.maxLength ?? '?'} chars
                  </code>
                </div>
              )}
              {hasDigits && (
                <div className="flex items-center justify-between px-3 py-2.5
                                border-b border-slate-200 dark:border-slate-800/60 last:border-b-0">
                  <span className="text-[11px] text-slate-500">Dígitos Totais</span>
                  <code className="text-[11px] font-mono text-slate-700 dark:text-slate-300 tabular-nums">
                    {r.totalDigits}{r.fractionDigits ? ` (${r.fractionDigits} dec.)` : ''}
                  </code>
                </div>
              )}
              {hasPattern && (
                <div className="flex flex-col gap-1.5 px-3 py-2.5">
                  <span className="text-[11px] text-slate-500">Padrão Regex</span>
                  <code className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 break-all leading-relaxed">
                    {r.pattern}
                  </code>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Enums */}
        {hasEnums && (
          <div className="px-4 py-4">
            <SectionLabel icon={List} label={`Valores Válidos (${r.enums.length})`} />
            <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800/60">
              {r.enums.map((en, i) => (
                <div
                  key={en.value + i}
                  className={[
                    'flex items-start gap-2.5 px-3 py-2',
                    i % 2 === 0 ? 'bg-slate-50 dark:bg-slate-900/60' : 'bg-white dark:bg-slate-800/20',
                    i < r.enums.length - 1 ? 'border-b border-slate-200 dark:border-slate-800/40' : '',
                  ].join(' ')}
                >
                  <code className="text-[10px] font-mono text-blue-600 dark:text-blue-400 shrink-0 mt-px">{en.value}</code>
                  {en.description && (
                    <span className="text-[10px] text-slate-500 leading-relaxed">{en.description}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Code example — terminal window */}
        <div className="px-4 py-4">
          <SectionLabel icon={Code2} label="Exemplo de Uso" />
          <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-950/80">

            {/* Title bar */}
            <div className="flex items-center justify-between px-3 py-2
                            border-b border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-900/70">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/40 border border-red-500/20" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/40 border border-yellow-500/20" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-500/40 border border-green-500/20" />
              </div>
              <div className="flex items-center gap-0.5">
                {['xml', 'json'].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setCodeTab(tab)}
                    className={[
                      'px-2.5 py-0.5 text-[10px] font-mono font-semibold rounded transition-all duration-150',
                      codeTab === tab
                        ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                        : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300',
                    ].join(' ')}
                  >
                    {tab.toUpperCase()}
                  </button>
                ))}
              </div>
              <CopyButton text={codeContent} />
            </div>

            {/* Code body */}
            <pre className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400/90 px-4 py-3
                            overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
              {codeContent}
            </pre>
          </div>
        </div>

      </div>
    </div>
  );
}
