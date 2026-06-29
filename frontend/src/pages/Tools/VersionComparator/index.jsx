import { useState, useEffect, useMemo, Fragment } from 'react';
import {
  GitCompare, Loader2, Plus, Minus, RefreshCw,
  AlertCircle, Search, X, ChevronDown, ArrowRight,
  Tag, Code2, FileDown, Lock, Zap, BookOpen,
} from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '../../../components/DashboardLayout';
import GuideModal from '../../../components/Modals/GuideModal';
import { TOOL_GUIDES } from '../../../config/toolGuides';
import api from '../../../services/api';

// ── Constants ─────────────────────────────────────────────────────────────────

const CHANGE_META = {
  ADD: {
    label: 'Adicionado', icon: Plus,
    color: 'text-emerald-700 dark:text-emerald-400',
    bg: 'bg-emerald-500/15', border: 'border-emerald-500/30',
  },
  REMOVED: {
    label: 'Removido', icon: Minus,
    color: 'text-red-700 dark:text-red-400',
    bg: 'bg-red-500/15', border: 'border-red-500/30',
  },
  MODIFIED: {
    label: 'Modificado', icon: RefreshCw,
    color: 'text-amber-700 dark:text-amber-400',
    bg: 'bg-amber-500/15', border: 'border-amber-500/30',
  },
};

// ── Pure helpers ──────────────────────────────────────────────────────────────

function parseDescription(description, changeType) {
  if (changeType === 'ADD') {
    return [{ label: 'Presença', from: 'Não existia', to: 'Campo adicionado' }];
  }
  if (changeType === 'REMOVED') {
    return [{ label: 'Presença', from: 'Campo presente', to: 'Campo removido' }];
  }
  const ARROW = ' → ';
  return (description ?? '').split(';').map(s => s.trim()).filter(Boolean).map(part => {
    const colonIdx = part.indexOf(':');
    if (colonIdx === -1) return { label: part, from: '—', to: '—' };
    const label = part.slice(0, colonIdx).trim();
    const rest  = part.slice(colonIdx + 1).trim();
    const arrowIdx = rest.indexOf(ARROW);
    if (arrowIdx === -1) return { label, from: rest, to: '—' };
    return { label, from: rest.slice(0, arrowIdx).trim(), to: rest.slice(arrowIdx + ARROW.length).trim() };
  });
}

function buildXmlLines(xpath) {
  const segs = xpath.split('/').filter(Boolean);
  const maxShow = 5;
  const startIdx = Math.max(0, segs.length - maxShow);
  const visible = segs.slice(startIdx);
  const lines = [];
  if (startIdx > 0) lines.push({ text: '<!-- ... -->', indent: 0, highlight: false });
  visible.forEach((seg, i) => {
    const isLeaf = i === visible.length - 1;
    lines.push(
      isLeaf
        ? { text: `<${seg}>`, value: '…', closer: `</${seg}>`, indent: i, highlight: true }
        : { text: `<${seg}>`, indent: i, highlight: false }
    );
  });
  for (let i = visible.length - 2; i >= 0; i--) {
    lines.push({ text: `</${visible[i]}>`, indent: i, highlight: false });
  }
  return lines;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function VersionSelect({ label, value, onChange, versions, disabled }) {
  return (
    <div className="flex-1 min-w-0">
      <label className="block text-[11px] font-semibold uppercase tracking-wider
                        text-slate-500 dark:text-slate-400 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled || versions.length === 0}
          className={[
            'w-full pl-3 pr-8 py-2.5 rounded-xl text-sm appearance-none cursor-pointer',
            'bg-white dark:bg-slate-800/60',
            'border border-slate-200 dark:border-slate-700/60',
            'text-slate-800 dark:text-slate-200',
            'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400',
            'disabled:opacity-50 disabled:cursor-not-allowed transition-all',
          ].join(' ')}
        >
          <option value="">{versions.length === 0 ? 'Nenhuma versão disponível' : 'Selecionar versão…'}</option>
          {versions.map(v => <option key={v.id} value={v.version}>{v.version}</option>)}
        </select>
        <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
      </div>
    </div>
  );
}

function SummaryCard({ type, value, active, onClick }) {
  const meta = CHANGE_META[type];
  const Icon = meta.icon;
  return (
    <button
      onClick={onClick}
      className={[
        'flex-1 flex flex-col items-center gap-1.5 py-3.5 px-4 rounded-xl border transition-all duration-150',
        active
          ? `${meta.bg} ${meta.border} shadow-sm scale-[1.02]`
          : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/80',
      ].join(' ')}
    >
      <Icon size={14} className={meta.color} />
      <span className={`text-2xl font-extrabold tabular-nums ${meta.color}`}>{value}</span>
      <span className="text-[11px] text-slate-500 leading-tight">{meta.label}</span>
    </button>
  );
}

function ChangeBadge({ type }) {
  const meta = CHANGE_META[type] ?? CHANGE_META.MODIFIED;
  const Icon = meta.icon;
  return (
    <span className={[
      'inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide',
      'px-2 py-0.5 rounded-full border whitespace-nowrap',
      meta.bg, meta.border, meta.color,
    ].join(' ')}>
      <Icon size={9} />
      {type}
    </span>
  );
}

// ── Expanded De/Para row ──────────────────────────────────────────────────────

const NA_LABELS = {
  'padrão regex': 'Sem restrição de padrão (texto aberto)',
  'maxLength':    'Não definido',
  'minLength':    'Não definido',
};

function isNA(v) { return !v || v === 'N/A' || v === '—'; }

function DiffValue({ label, raw, colorCls }) {
  if (!isNA(raw)) {
    return (
      <span className={`text-xs font-semibold font-mono break-all ${colorCls}`}>
        {raw}
      </span>
    );
  }
  return (
    <span className="text-xs italic text-slate-400 dark:text-slate-500 leading-tight">
      {NA_LABELS[label] ?? 'Não definido'}
    </span>
  );
}

function ExpandedDetails({ row, sourceVersion, targetVersion }) {
  const diffs = parseDescription(row.description, row.change_type);
  const isMod = row.change_type === 'MODIFIED';
  const isAdd = row.change_type === 'ADD';

  // Suppress lines where both sides have no real information
  const visibleDiffs = diffs.filter(d => !(isNA(d.from) && isNA(d.to)));

  const toColorCls = isMod || isAdd
    ? 'text-emerald-700 dark:text-emerald-300'
    : 'text-rose-700 dark:text-rose-300';

  return (
    <div className="py-3 pr-2">
      <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mb-3 truncate" title={row.xpath}>
        {row.xpath}
      </p>

      <div className="grid grid-cols-2 gap-3">
        {/* DE */}
        <div className="rounded-xl border border-rose-300/40 dark:border-rose-500/30
                        bg-rose-50 dark:bg-rose-500/10 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-rose-500 mb-2.5">
            Como era · {sourceVersion}
          </p>
          <div className="flex flex-col gap-1.5">
            {visibleDiffs.map((d, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <span className="text-[10px] text-rose-400/70 shrink-0 mt-0.5 font-medium whitespace-nowrap">
                  {d.label}:
                </span>
                <DiffValue label={d.label} raw={d.from} colorCls="text-rose-700 dark:text-rose-300" />
              </div>
            ))}
          </div>
        </div>

        {/* PARA */}
        <div className={[
          'rounded-xl border p-3',
          isMod || isAdd
            ? 'border-emerald-300/40 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10'
            : 'border-rose-300/40 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10',
        ].join(' ')}>
          <p className={`text-[10px] font-bold uppercase tracking-wider mb-2.5 ${
            isMod || isAdd ? 'text-emerald-500' : 'text-rose-500'
          }`}>
            Como ficou · {targetVersion}
          </p>
          <div className="flex flex-col gap-1.5">
            {visibleDiffs.map((d, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <span className={`text-[10px] shrink-0 mt-0.5 font-medium whitespace-nowrap ${
                  isMod || isAdd ? 'text-emerald-400/70' : 'text-rose-400/70'
                }`}>
                  {d.label}:
                </span>
                <DiffValue label={d.label} raw={d.to} colorCls={toColorCls} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── XML Snippet Modal ─────────────────────────────────────────────────────────

function ContextXmlModal({ row, onClose }) {
  const lines = buildXmlLines(row.xpath);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl
                   bg-white dark:bg-slate-900
                   border border-slate-200 dark:border-slate-700/60"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5
                        border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Code2 size={15} className="text-blue-500" />
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Contexto XML</span>
            <span className="ml-1 text-[10px] font-mono px-1.5 py-0.5 rounded
                             bg-slate-100 dark:bg-slate-800
                             text-slate-500 dark:text-slate-400">
              {row.field_name}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Note */}
        <div className="px-5 pt-3 pb-0">
          <div className="flex items-center gap-1.5 text-[10px] text-amber-600 dark:text-amber-400
                          bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30
                          rounded-lg px-3 py-1.5 mb-3">
            <AlertCircle size={10} className="shrink-0" />
            Representação fictícia do contexto hierárquico — valores ilustrativos.
          </div>
        </div>

        {/* Code block */}
        <div className="px-5 pb-4">
          <div className="font-mono text-xs bg-slate-950 dark:bg-slate-950
                          rounded-xl p-4 overflow-x-auto leading-relaxed">
            {lines.map((line, i) => {
              const pad = ' '.repeat(line.indent * 2);
              if (line.highlight) {
                return (
                  <div key={i} className="flex items-baseline gap-0
                                          bg-amber-500/20 rounded px-1 my-0.5">
                    <span className="text-slate-500">{pad}</span>
                    <span className="text-amber-300">{line.text}</span>
                    <span className="text-amber-100/60">{line.value}</span>
                    <span className="text-amber-300">{line.closer}</span>
                    <span className="ml-2 text-amber-500/60 text-[9px]">← campo afetado</span>
                  </div>
                );
              }
              return (
                <div key={i} className="text-slate-400">
                  {pad}{line.text}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer badge */}
        <div className="flex items-center gap-2 px-5 py-3
                        border-t border-slate-200 dark:border-slate-800
                        bg-slate-50 dark:bg-slate-800/40">
          <ChangeBadge type={row.change_type} />
          <span className="text-[11px] text-slate-500 truncate">{row.description}</span>
        </div>
      </div>
    </div>
  );
}

// ── Upgrade Modal ─────────────────────────────────────────────────────────────

const UPGRADE_PLANS = [
  { name: 'Bronze', price: 'R$ 49,90/mês',  color: 'text-amber-700 dark:text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-400/40'  },
  { name: 'Prata',  price: 'R$ 99,90/mês',  color: 'text-slate-500 dark:text-slate-300',  bg: 'bg-slate-500/10',  border: 'border-slate-400/40'  },
  { name: 'Ouro',   price: 'R$ 199,90/mês', color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-400/40' },
];

function UpgradeModal({ onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl
                   bg-white dark:bg-slate-900
                   border border-slate-200 dark:border-slate-700/60"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4
                        border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Zap size={15} className="text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Recurso Premium</p>
              <p className="text-[11px] text-slate-400">Disponível nos planos pagos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5">
          <div className="flex items-start gap-3 p-3.5 rounded-xl
                          bg-amber-50 dark:bg-amber-500/10
                          border border-amber-200 dark:border-amber-500/30 mb-5">
            <Lock size={14} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
              A exportação de relatórios em PDF está disponível a partir do plano <strong>Bronze</strong>.
              Faça upgrade para desbloquear esta e outras funcionalidades avançadas.
            </p>
          </div>

          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Escolha seu plano
          </p>

          <div className="flex flex-col gap-2.5">
            {UPGRADE_PLANS.map(plan => (
              <div
                key={plan.name}
                className={`flex items-center justify-between px-4 py-3 rounded-xl border ${plan.bg} ${plan.border}`}
              >
                <div className="flex items-center gap-2">
                  <Zap size={13} className={plan.color} />
                  <span className={`text-sm font-bold ${plan.color}`}>{plan.name}</span>
                </div>
                <span className={`text-xs font-semibold ${plan.color}`}>{plan.price}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5">
          <p className="text-center text-xs text-slate-400 mb-3">
            Entre em contato com o administrador para fazer upgrade do seu plano.
          </p>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sm font-semibold
                       bg-blue-600 hover:bg-blue-700 text-white
                       transition-colors shadow-sm"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

// ── PDF generator ─────────────────────────────────────────────────────────────

async function generatePdf({ filteredRows, sourceVersion, targetVersion, selectedGuiaType, activeFilter, search }) {
  if (filteredRows.length === 0) {
    toast.error('Nenhum dado para exportar com os filtros atuais.');
    return;
  }

  try {
    const { jsPDF } = await import('jspdf');
    const autoTable  = (await import('jspdf-autotable')).default;

    const doc   = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();

    const now     = new Date();
    const dateStr = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // ── Header band ────────────────────────────────────────────────────────────
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pageW, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('TISSflow · Relatório de Mudanças TISS', 10, 10);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Versão ${sourceVersion}  →  ${targetVersion}`, 10, 17);
    doc.text(`Gerado em ${dateStr} às ${timeStr}`, pageW - 10, 17, { align: 'right' });

    // ── Active filters note ────────────────────────────────────────────────────
    const filterParts = [];
    if (selectedGuiaType) filterParts.push(`Guia: ${selectedGuiaType}`);
    if (activeFilter !== 'ALL') filterParts.push(`Tipo: ${activeFilter}`);
    if (search.trim()) filterParts.push(`Busca: "${search}"`);

    let cursorY = 24;
    if (filterParts.length > 0) {
      doc.setFillColor(239, 246, 255);
      doc.rect(0, 22, pageW, 8, 'F');
      doc.setTextColor(37, 99, 235);
      doc.setFontSize(7);
      doc.text(`Filtros ativos: ${filterParts.join('  ·  ')}`, 10, 27.5);
      cursorY = 32;
    }

    // ── Summary boxes ──────────────────────────────────────────────────────────
    const adds    = filteredRows.filter(r => r.change_type === 'ADD').length;
    const removed = filteredRows.filter(r => r.change_type === 'REMOVED').length;
    const modif   = filteredRows.filter(r => r.change_type === 'MODIFIED').length;

    const summaryItems = [
      { label: 'Total',        value: filteredRows.length, rgb: [71,  85,  105] },
      { label: 'Adicionados',  value: adds,               rgb: [16,  185, 129] },
      { label: 'Removidos',    value: removed,             rgb: [239, 68,  68]  },
      { label: 'Modificados',  value: modif,               rgb: [245, 158, 11]  },
    ];

    const boxW = 44, boxH = 18, boxGap = 4;
    summaryItems.forEach(({ label, value, rgb }, i) => {
      const x = 10 + i * (boxW + boxGap);
      doc.setDrawColor(...rgb);
      doc.setFillColor(250, 250, 252);
      doc.roundedRect(x, cursorY + 1, boxW, boxH, 2, 2, 'FD');

      doc.setTextColor(...rgb);
      doc.setFontSize(15);
      doc.setFont('helvetica', 'bold');
      doc.text(String(value), x + boxW / 2, cursorY + 10, { align: 'center' });

      doc.setTextColor(100, 116, 139);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(label, x + boxW / 2, cursorY + 16, { align: 'center' });
    });

    // ── Table ──────────────────────────────────────────────────────────────────
    autoTable(doc, {
      startY: cursorY + boxH + 6,
      head: [['Campo', 'XPath', 'Guia', 'Tipo', 'Detalhes da Alteração']],
      body: filteredRows.map(r => [
        r.field_name,
        r.xpath,
        r.guia_type ?? '',
        r.change_type,
        r.description ?? '',
      ]),
      styles: {
        fontSize: 7,
        cellPadding: 2.5,
        overflow: 'linebreak',
        textColor: [51, 65, 85],
      },
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7,
      },
      columnStyles: {
        0: { cellWidth: 35, fontStyle: 'bold' },
        1: { cellWidth: 68, font: 'courier', fontSize: 6, textColor: [100, 116, 139] },
        2: { cellWidth: 32 },
        3: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
        4: { cellWidth: 'auto' },
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      didParseCell(data) {
        if (data.section === 'body' && data.column.index === 3) {
          const t = data.cell.raw;
          if (t === 'ADD')      data.cell.styles.textColor = [16, 185, 129];
          else if (t === 'REMOVED')  data.cell.styles.textColor = [239, 68, 68];
          else if (t === 'MODIFIED') data.cell.styles.textColor = [245, 158, 11];
        }
      },
    });

    // ── Footer on every page ───────────────────────────────────────────────────
    const total = doc.internal.getNumberOfPages();
    for (let p = 1; p <= total; p++) {
      doc.setPage(p);
      const pH = doc.internal.pageSize.getHeight();
      doc.setFillColor(248, 250, 252);
      doc.rect(0, pH - 8, pageW, 8, 'F');
      doc.setTextColor(148, 163, 184);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.text('TISSflow · Relatório confidencial gerado automaticamente.', 10, pH - 3);
      doc.text(`Página ${p} de ${total}`, pageW - 10, pH - 3, { align: 'right' });
    }

    const safe   = (s) => s.replace(/[^a-zA-Z0-9._-]/g, '_');
    const suffix = selectedGuiaType ? `-${safe(selectedGuiaType)}` : '';
    doc.save(`tiss-diff-${safe(sourceVersion)}-vs-${safe(targetVersion)}${suffix}.pdf`);
    toast.success('PDF exportado com sucesso.');
  } catch (err) {
    console.error('[exportPdf]', err);
    toast.error('Erro ao gerar o PDF. Tente novamente.');
  }
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function VersionComparator() {
  const [versions,       setVersions]       = useState([]);
  const [sourceVersion,  setSourceVersion]  = useState('');
  const [targetVersion,  setTargetVersion]  = useState('');
  const [loadingMeta,    setLoadingMeta]    = useState(true);
  const [loadingDiff,    setLoadingDiff]    = useState(false);
  const [diffData,       setDiffData]       = useState(null);

  // Filter states
  const [search,           setSearch]           = useState('');
  const [activeFilter,     setActiveFilter]     = useState('ALL');
  const [selectedGuiaType, setSelectedGuiaType] = useState('');

  // Feature states
  const [expandedRows,    setExpandedRows]    = useState(new Set());
  const [xmlModalRow,     setXmlModalRow]     = useState(null);
  const [exportingPdf,    setExportingPdf]    = useState(false);
  const [userProfile,     setUserProfile]     = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isGuideOpen,      setIsGuideOpen]      = useState(false);

  // ── Load user profile for plan check ──────────────────────────────────────
  useEffect(() => {
    api.get('/auth/profile')
      .then(({ data }) => setUserProfile(data.user))
      .catch(() => {});
  }, []);

  const canExportPdf = userProfile?.plan?.name !== 'Free Trial';

  // ── Load versions on mount ─────────────────────────────────────────────────
  useEffect(() => {
    api.get('/tools/version-diff/versions')
      .then(({ data }) => setVersions(data.versions ?? []))
      .catch(() => toast.error('Erro ao carregar versões TISS disponíveis.'))
      .finally(() => setLoadingMeta(false));
  }, []);

  // ── Fetch diff on pair change ──────────────────────────────────────────────
  useEffect(() => {
    if (!sourceVersion || !targetVersion || sourceVersion === targetVersion) {
      setDiffData(null);
      return;
    }
    setLoadingDiff(true);
    setDiffData(null);
    setSearch('');
    setActiveFilter('ALL');
    setSelectedGuiaType('');
    setExpandedRows(new Set());

    api.get('/tools/version-diff', { params: { sourceVersion, targetVersion } })
      .then(({ data }) => setDiffData(data))
      .catch(err => toast.error(err.response?.data?.error ?? 'Erro ao carregar diferenças.'))
      .finally(() => setLoadingDiff(false));
  }, [sourceVersion, targetVersion]);

  // Reset change-type filter when guia type changes
  useEffect(() => {
    setActiveFilter('ALL');
    setSearch('');
  }, [selectedGuiaType]);

  function toggleRow(id) {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // ── Derived data ───────────────────────────────────────────────────────────
  const sameVersion  = Boolean(sourceVersion && targetVersion && sourceVersion === targetVersion);
  const allChanges   = diffData?.changes ?? [];

  const uniqueGuiaTypes = useMemo(() => {
    const types = [...new Set(allChanges.map(c => c.guia_type).filter(Boolean))];
    return types.sort();
  }, [allChanges]);

  const guiaChanges = useMemo(() => {
    if (!selectedGuiaType) return allChanges;
    return allChanges.filter(c => c.guia_type === selectedGuiaType);
  }, [allChanges, selectedGuiaType]);

  const activeSummary = useMemo(() => ({
    total:    guiaChanges.length,
    adds:     guiaChanges.filter(c => c.change_type === 'ADD').length,
    removed:  guiaChanges.filter(c => c.change_type === 'REMOVED').length,
    modified: guiaChanges.filter(c => c.change_type === 'MODIFIED').length,
  }), [guiaChanges]);

  const filteredRows = useMemo(() => {
    let rows = guiaChanges;
    if (activeFilter !== 'ALL') rows = rows.filter(r => r.change_type === activeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        r.field_name.toLowerCase().includes(q) ||
        r.xpath.toLowerCase().includes(q) ||
        (r.guia_type ?? '').toLowerCase().includes(q)
      );
    }
    return rows;
  }, [guiaChanges, activeFilter, search]);

  const FILTER_TABS = [
    { key: 'ALL',      label: 'Todos',       count: activeSummary.total    },
    { key: 'ADD',      label: 'Adicionados', count: activeSummary.adds     },
    { key: 'REMOVED',  label: 'Removidos',   count: activeSummary.removed  },
    { key: 'MODIFIED', label: 'Modificados', count: activeSummary.modified },
  ];

  async function handleExportPdf() {
    setExportingPdf(true);
    try {
      await generatePdf({ filteredRows, sourceVersion, targetVersion, selectedGuiaType, activeFilter, search });
    } finally {
      setExportingPdf(false);
    }
  }

  // ── Body renderer ──────────────────────────────────────────────────────────
  function renderBody() {
    if (!sourceVersion || !targetVersion) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800/60
                          border border-slate-200 dark:border-slate-800 flex items-center justify-center">
            <GitCompare size={24} className="text-slate-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Selecione duas versões acima para iniciar a comparação técnica
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Escolha a versão base e a versão alvo nos seletores para visualizar o relatório de mudanças.
            </p>
          </div>
        </div>
      );
    }

    if (sameVersion) {
      return (
        <div className="flex items-center gap-2.5 px-4 py-4 rounded-xl
                        bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30">
          <AlertCircle size={16} className="text-amber-500 shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Selecione versões <strong>diferentes</strong> para ver o comparativo de mudanças.
          </p>
        </div>
      );
    }

    if (loadingDiff) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 py-20">
          <Loader2 size={28} className="text-blue-500 animate-spin" />
          <p className="text-xs text-slate-400">
            Carregando diferenças entre{' '}
            <strong className="text-slate-600 dark:text-slate-300">{sourceVersion}</strong>
            {' → '}
            <strong className="text-slate-600 dark:text-slate-300">{targetVersion}</strong>…
          </p>
        </div>
      );
    }

    if (diffData && diffData.total === 0) {
      return (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800/60
                          border border-slate-200 dark:border-slate-800 flex items-center justify-center">
            <AlertCircle size={22} className="text-slate-400" />
          </div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Nenhuma diferença encontrada para este par
          </p>
          <p className="text-xs text-slate-400">
            As versões podem ser idênticas ou o diff ainda não foi gerado pelo administrador.
          </p>
        </div>
      );
    }

    if (!diffData) return null;

    return (
      <>
        {/* Summary cards */}
        <div className="flex gap-3 mb-5">
          <SummaryCard type="ADD"      value={activeSummary.adds}     active={activeFilter === 'ADD'}      onClick={() => setActiveFilter(f => f === 'ADD'      ? 'ALL' : 'ADD')}      />
          <SummaryCard type="REMOVED"  value={activeSummary.removed}  active={activeFilter === 'REMOVED'}  onClick={() => setActiveFilter(f => f === 'REMOVED'  ? 'ALL' : 'REMOVED')}  />
          <SummaryCard type="MODIFIED" value={activeSummary.modified} active={activeFilter === 'MODIFIED'} onClick={() => setActiveFilter(f => f === 'MODIFIED' ? 'ALL' : 'MODIFIED')} />
        </div>

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4 flex-wrap">

          {/* Text search */}
          <div className="relative w-full sm:w-52 shrink-0">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Campo, xpath…"
              className="w-full pl-9 pr-8 py-2 rounded-xl text-sm
                         bg-white dark:bg-slate-900/60
                         border border-slate-200 dark:border-slate-800/60
                         text-slate-800 dark:text-slate-200 placeholder:text-slate-400
                         focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
            />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2
                           text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <X size={13} />
              </button>
            )}
          </div>

          {/* Guia type dropdown */}
          {uniqueGuiaTypes.length > 0 && (
            <div className="relative shrink-0 w-full sm:w-52">
              <Tag size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={selectedGuiaType}
                onChange={e => setSelectedGuiaType(e.target.value)}
                className="w-full pl-8 pr-8 py-2 rounded-xl text-sm appearance-none cursor-pointer
                           bg-white dark:bg-slate-900/60
                           border border-slate-200 dark:border-slate-800/60
                           text-slate-800 dark:text-slate-200
                           focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
              >
                <option value="">Todos os tipos de guia</option>
                {uniqueGuiaTypes.map(gt => <option key={gt} value={gt}>{gt}</option>)}
              </select>
              <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          )}

          {/* Change type tabs */}
          <div className="flex items-center gap-1 flex-wrap">
            {FILTER_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={[
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 whitespace-nowrap',
                  activeFilter === tab.key
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800',
                ].join(' ')}
              >
                {tab.label}
                <span className={`ml-1.5 tabular-nums ${activeFilter === tab.key ? 'text-blue-200' : 'text-slate-400'}`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* PDF export — always rightmost */}
          <div className="ml-auto">
            {canExportPdf ? (
              <button
                onClick={handleExportPdf}
                disabled={exportingPdf || filteredRows.length === 0}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold
                           bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed
                           text-white transition-colors shadow-sm"
              >
                {exportingPdf
                  ? <Loader2 size={13} className="animate-spin" />
                  : <FileDown size={13} />
                }
                {exportingPdf ? 'Gerando…' : 'Exportar PDF'}
              </button>
            ) : (
              <button
                onClick={() => setShowUpgradeModal(true)}
                title="Exportação de PDF disponível apenas em planos pagos"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold
                           bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700
                           text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700
                           transition-colors"
              >
                <Lock size={13} />
                Exportar PDF
              </button>
            )}
          </div>
        </div>

        {/* Active guia chip */}
        {selectedGuiaType && (
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium
                             px-2.5 py-1 rounded-full
                             bg-blue-500/10 text-blue-700 dark:text-blue-400
                             border border-blue-400/30">
              <Tag size={10} />
              {selectedGuiaType}
              <button onClick={() => setSelectedGuiaType('')}
                className="ml-0.5 hover:text-blue-900 dark:hover:text-blue-200 transition-colors">
                <X size={10} />
              </button>
            </span>
            <span className="text-xs text-slate-400">
              {activeSummary.total} registro{activeSummary.total !== 1 ? 's' : ''} neste tipo
            </span>
          </div>
        )}

        {/* Table */}
        {filteredRows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <Search size={18} className="text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-slate-500">
              {search
                ? <>Nenhum campo encontrado para <strong>"{search}"</strong> com os filtros ativos.</>
                : 'Nenhum registro para a combinação de filtros selecionada.'
              }
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900/60
                          border border-slate-200 dark:border-slate-800/60
                          rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800/60
                                 bg-slate-50 dark:bg-slate-800/40">
                    {/* expand toggle (no header label) */}
                    <th className="w-8" />
                    {['Campo', 'Tipo de Guia', 'Mudança', 'Descrição / Detalhe'].map(h => (
                      <th key={h} className="text-left py-3 px-4 text-xs font-semibold
                                             text-slate-500 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                    {/* xml button (no header label) */}
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, i) => {
                    const rowId    = row.id ?? i;
                    const expanded = expandedRows.has(rowId);
                    return (
                      <Fragment key={rowId}>
                        <tr
                          onClick={() => toggleRow(rowId)}
                          className="border-b border-slate-100 dark:border-slate-800/40
                                     hover:bg-slate-50 dark:hover:bg-white/[0.025]
                                     transition-colors duration-100 cursor-pointer group"
                        >
                          {/* Expand chevron */}
                          <td className="pl-3 pr-0 py-3 text-slate-300 dark:text-slate-600 group-hover:text-slate-400">
                            <ChevronDown
                              size={14}
                              className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                            />
                          </td>

                          {/* Campo + xpath */}
                          <td className="py-3 px-4">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-semibold font-mono text-xs text-slate-800 dark:text-slate-100">
                                {row.field_name}
                              </span>
                              <span
                                className="text-[10px] text-slate-400 dark:text-slate-500 font-mono truncate max-w-[240px]"
                                title={row.xpath}
                              >
                                {row.xpath}
                              </span>
                            </div>
                          </td>

                          {/* Guia type */}
                          <td className="py-3 px-4">
                            <span className="text-xs font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                              {row.guia_type ?? '—'}
                            </span>
                          </td>

                          {/* Badge */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <ChangeBadge type={row.change_type} />
                          </td>

                          {/* Description (truncated) */}
                          <td className="py-3 px-4">
                            <span
                              className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed
                                         line-clamp-2"
                              title={row.description ?? ''}
                            >
                              {row.description ?? '—'}
                            </span>
                          </td>

                          {/* XML preview button */}
                          <td className="pr-3 pl-0 py-3">
                            <button
                              onClick={e => { e.stopPropagation(); setXmlModalRow(row); }}
                              title="Ver contexto XML"
                              className="p-1.5 rounded-lg
                                         text-slate-300 dark:text-slate-600
                                         hover:text-blue-500 hover:bg-blue-500/10
                                         transition-colors"
                            >
                              <Code2 size={13} />
                            </button>
                          </td>
                        </tr>

                        {/* Expanded De/Para row */}
                        {expanded && (
                          <tr className="border-b border-slate-100 dark:border-slate-800/40
                                         bg-slate-50/60 dark:bg-slate-800/20">
                            <td />
                            <td colSpan={5} className="pl-2 pr-6">
                              <ExpandedDetails
                                row={row}
                                sourceVersion={sourceVersion}
                                targetVersion={targetVersion}
                              />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table footer */}
            <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800/40
                            bg-slate-50/50 dark:bg-slate-800/20">
              <p className="text-[11px] text-slate-400">
                Exibindo{' '}
                <strong className="text-slate-600 dark:text-slate-300">{filteredRows.length}</strong> de{' '}
                <strong className="text-slate-600 dark:text-slate-300">{activeSummary.total}</strong>{' '}
                {selectedGuiaType ? `registros em "${selectedGuiaType}"` : 'mudanças totais'}{' '}·{' '}
                <code className="font-mono text-blue-500 dark:text-blue-400">{diffData.sourceVersion}</code>
                {' → '}
                <code className="font-mono text-blue-500 dark:text-blue-400">{diffData.targetVersion}</code>
              </p>
            </div>
          </div>
        )}
      </>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-7">
          <span className="inline-flex items-center text-xs font-mono font-bold px-2 py-0.5 rounded-md
                           bg-blue-500/10 text-blue-600 dark:text-blue-400
                           border border-blue-500/30 mb-3">
            FERRAMENTAS TISS
          </span>
          <div className="flex items-center gap-3">
            <GitCompare size={22} className="text-blue-500 shrink-0" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
              Comparador de Versões TISS
            </h1>
            <button
              onClick={() => setIsGuideOpen(true)}
              className="ml-1 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold
                         bg-blue-50 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400
                         border border-blue-200 dark:border-blue-500/30
                         hover:bg-blue-100 dark:hover:bg-blue-600/20 transition-all duration-200"
            >
              <BookOpen size={13} />
              Como Usar
            </button>
          </div>
          <p className="text-slate-500 text-sm mt-1.5">
            Selecione duas versões para visualizar todos os campos adicionados, removidos
            ou modificados no padrão ANS.
          </p>
        </div>

        {/* Version selector card */}
        <div className="bg-white dark:bg-slate-900/60
                        border border-slate-200 dark:border-slate-800/60
                        rounded-2xl p-5 mb-6">
          {loadingMeta ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={22} className="text-slate-400 animate-spin" />
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-end gap-3">
              <VersionSelect label="Versão Base (De)" value={sourceVersion} onChange={setSourceVersion}
                             versions={versions} disabled={loadingDiff} />
              <div className="flex items-center pb-3 shrink-0">
                <ArrowRight size={16} className="text-slate-300 dark:text-slate-600" />
              </div>
              <VersionSelect label="Versão Alvo (Para)" value={targetVersion} onChange={setTargetVersion}
                             versions={versions} disabled={loadingDiff} />
            </div>
          )}
          {!loadingMeta && versions.length === 0 && (
            <p className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 mt-3">
              <AlertCircle size={12} />
              Ainda não há versões TISS cadastradas. O administrador precisa fazer upload dos
              schemas XSD em <strong>Admin → Módulos XSD</strong>.
            </p>
          )}
        </div>

        {/* Main body */}
        {renderBody()}

      </div>

      {/* XML Modal — rendered at root level to escape table stacking context */}
      {xmlModalRow && (
        <ContextXmlModal row={xmlModalRow} onClose={() => setXmlModalRow(null)} />
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <UpgradeModal onClose={() => setShowUpgradeModal(false)} />
      )}

      {/* Guide Modal */}
      {isGuideOpen && (
        <GuideModal guide={TOOL_GUIDES['version-comparator']} onClose={() => setIsGuideOpen(false)} />
      )}
    </DashboardLayout>
  );
}
