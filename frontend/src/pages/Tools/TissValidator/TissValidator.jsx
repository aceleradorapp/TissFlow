import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ShieldCheck, ShieldX, ShieldAlert,
  UploadCloud, FileCode2, RefreshCw,
  CheckCircle2, XCircle, AlertTriangle,
  Download, BookOpen, Loader2,
  Hash, ScanSearch, Calculator,
  Wand2, FileCheck2,
} from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '../../../components/DashboardLayout';
import GuideModal      from '../../../components/Modals/GuideModal';
import { TOOL_GUIDES } from '../../../config/toolGuides';
import api             from '../../../services/api';

// ── Layer meta ─────────────────────────────────────────────────────────────────

const LAYER_META = {
  schema: { label: 'Estrutura XSD',       Icon: ScanSearch,  color: 'blue'   },
  hash:   { label: 'Integridade MD5',      Icon: Hash,        color: 'purple' },
  audit:  { label: 'Auditoria Matemática', Icon: Calculator,  color: 'amber'  },
};

const LAYER_STATUS_STYLE = {
  OK:     'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  FAILED: 'text-red-600     dark:text-red-400     bg-red-500/10     border-red-500/30',
  N_A:    'text-slate-500   dark:text-slate-400   bg-slate-500/10   border-slate-500/30',
};

// ── Dropzone sub-component ─────────────────────────────────────────────────────

function ValidatorDropzone({ onFile, loading }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  }

  function handleChange(e) {
    const file = e.target.files?.[0];
    if (file) onFile(file);
    e.target.value = '';
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !loading && inputRef.current?.click()}
      className={[
        'relative flex flex-col items-center justify-center gap-5 rounded-2xl select-none',
        'border-2 border-dashed transition-all duration-200',
        'min-h-[320px] px-10 py-12',
        loading ? 'cursor-wait opacity-70' : 'cursor-pointer',
        dragging
          ? 'border-blue-500 bg-blue-500/5 scale-[1.01]'
          : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/40',
        !loading && 'hover:border-blue-400 dark:hover:border-blue-500/60 hover:bg-blue-500/[0.03]',
      ].join(' ')}
    >
      <div className={[
        'w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-200',
        dragging
          ? 'bg-blue-500/20 border border-blue-500/40'
          : 'bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60',
      ].join(' ')}>
        {loading
          ? <Loader2 size={28} className="text-blue-500 animate-spin" />
          : dragging
            ? <FileCode2 size={28} className="text-blue-500" />
            : <UploadCloud size={28} className="text-slate-400 dark:text-slate-500" />
        }
      </div>

      <div className="text-center">
        <p className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-1">
          {loading ? 'Validando arquivo…' : dragging ? 'Solte o arquivo aqui' : 'Arraste seu XML TISS'}
        </p>
        {!loading && (
          <>
            <p className="text-sm text-slate-400 dark:text-slate-500">
              ou <span className="text-blue-600 dark:text-blue-400 font-medium underline underline-offset-2">clique para selecionar</span>
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
              Validação em 3 camadas · XSD · Hash MD5 · Auditoria matemática · Máx: 10 MB
            </p>
          </>
        )}
      </div>

      {!loading && (
        <div className="flex flex-wrap justify-center gap-2">
          {['Estrutura XSD', 'Hash MD5', 'Auditoria de guias', 'Relatório PDF'].map((f) => (
            <span
              key={f}
              className="text-[10px] font-medium px-2.5 py-1 rounded-full
                         bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-500
                         border border-slate-200 dark:border-slate-700/50"
            >{f}</span>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".xml"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}

// ── Layer status badge ─────────────────────────────────────────────────────────

function LayerBadge({ layerKey, layer }) {
  const { label, Icon } = LAYER_META[layerKey] ?? { label: layerKey, Icon: ShieldAlert };
  const status  = layer?.status ?? 'N_A';
  const style   = LAYER_STATUS_STYLE[status] ?? LAYER_STATUS_STYLE.N_A;
  const count   = layer?.errorCount ?? 0;

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium ${style}`}>
      <Icon size={14} className="shrink-0" />
      <span>{label}</span>
      <span className="ml-auto text-xs font-bold">
        {status === 'OK' ? 'OK' : `${count} erro${count !== 1 ? 's' : ''}`}
      </span>
    </div>
  );
}

// ── Executive summary card ─────────────────────────────────────────────────────

function SummaryCard({ result, fileName }) {
  const isValid = result.valid;

  const cardStyle = isValid
    ? 'border-emerald-400/40 bg-emerald-500/5 dark:bg-emerald-900/10'
    : 'border-red-400/40 bg-red-500/5 dark:bg-red-900/10';

  const headerStyle = isValid
    ? 'bg-emerald-500/10 dark:bg-emerald-900/20 border-b border-emerald-400/30'
    : 'bg-red-500/10 dark:bg-red-900/20 border-b border-red-400/30';

  const HeadIcon = isValid ? ShieldCheck : ShieldX;
  const headColor = isValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400';

  const { summary, layers, errors, errorSummary } = result;

  const META_ROWS = [
    { label: 'Arquivo',          value: summary?.arquivo    },
    { label: 'Versão TISS',      value: summary?.versao     },
    { label: 'Número do Lote',   value: summary?.lote       },
    { label: 'Operadora (ANS)',  value: summary?.operadora  },
    { label: 'Tipo de Guia',     value: summary?.tipoGuia   },
    { label: 'Total de Guias',   value: summary?.totalGuias != null ? String(summary.totalGuias) : null },
    { label: 'Valor Total',      value: summary?.valorTotal },
  ];

  return (
    <div className={`rounded-2xl border overflow-hidden ${cardStyle}`}>
      {/* Header */}
      <div className={`flex items-center gap-3 px-5 py-4 ${headerStyle}`}>
        <HeadIcon size={22} className={headColor} />
        <div>
          <p className={`text-sm font-bold ${headColor}`}>
            {isValid ? 'Arquivo válido — nenhuma irregularidade encontrada.' : `${errors.length} irregularidade${errors.length !== 1 ? 's' : ''} encontrada${errors.length !== 1 ? 's' : ''}`}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {fileName}
          </p>
        </div>
      </div>

      <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Metadata */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
            Sumário do Arquivo
          </p>
          <dl className="space-y-2">
            {META_ROWS.map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between gap-4">
                <dt className="text-xs text-slate-500 dark:text-slate-400 shrink-0">{label}</dt>
                <dd className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate text-right">
                  {value ?? '—'}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Layers + error summary */}
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
              Resultado por Camada
            </p>
            <div className="flex flex-col gap-2">
              {Object.entries(layers ?? {}).map(([key, layer]) => (
                <LayerBadge key={key} layerKey={key} layer={layer} />
              ))}
            </div>
          </div>

          {!isValid && errorSummary?.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                Contagem por Código
              </p>
              <div className="rounded-xl border border-red-400/20 overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-red-500/8 dark:bg-red-900/15">
                      <th className="text-left px-3 py-2 font-semibold text-slate-600 dark:text-slate-400">Código</th>
                      <th className="text-right px-3 py-2 font-semibold text-slate-600 dark:text-slate-400 w-16">Qtd.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {errorSummary.map((e, i) => (
                      <tr
                        key={e.code}
                        className={i % 2 === 0 ? 'bg-white dark:bg-slate-900/20' : 'bg-red-500/5 dark:bg-red-900/10'}
                      >
                        <td className="px-3 py-2 font-mono text-red-700 dark:text-red-400">{e.code}</td>
                        <td className="px-3 py-2 text-right font-bold text-slate-700 dark:text-slate-300">{e.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail table */}
      {!isValid && errors?.length > 0 && (
        <div className="border-t border-red-400/20 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
            Detalhamento das Falhas
          </p>
          <div className="rounded-xl border border-red-400/20 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-red-500/8 dark:bg-red-900/15">
                  <th className="text-left px-3 py-2.5 font-semibold text-slate-600 dark:text-slate-400 w-8">#</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-slate-600 dark:text-slate-400">Camada</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-slate-600 dark:text-slate-400">Código</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-slate-600 dark:text-slate-400">Descrição</th>
                </tr>
              </thead>
              <tbody>
                {errors.map((e, i) => {
                  const meta = LAYER_META[e.layer] ?? { label: e.layer, Icon: ShieldAlert };
                  return (
                    <tr
                      key={i}
                      className={i % 2 === 0 ? 'bg-white dark:bg-slate-900/20' : 'bg-red-500/5 dark:bg-red-900/10'}
                    >
                      <td className="px-3 py-2 text-slate-400 dark:text-slate-500">{i + 1}</td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md
                                         bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400
                                         border border-slate-200 dark:border-slate-700">
                          <meta.Icon size={9} />
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono text-[10px] text-red-700 dark:text-red-400 whitespace-nowrap">
                        {e.code}
                      </td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-300 leading-relaxed">
                        {e.description}
                        {e.details && (
                          <span className="block text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-mono">
                            {e.details}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── PDF export ─────────────────────────────────────────────────────────────────

async function exportPdf(result, fileName) {
  try {
    const { jsPDF }  = await import('jspdf');
    const autoTable  = (await import('jspdf-autotable')).default;

    const doc   = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const now   = new Date();
    const dateStr = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // Header band
    const headerColor = result.valid ? [16, 185, 129] : [220, 38, 38];
    doc.setFillColor(...headerColor);
    doc.rect(0, 0, pageW, 24, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('TISSflow · Relatório de Validação TISS', 10, 10);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(fileName, 10, 17);
    doc.text(`Gerado em ${dateStr} às ${timeStr}`, pageW - 10, 17, { align: 'right' });

    // Status banner
    const bannerBg  = result.valid ? [209, 250, 229] : [254, 226, 226];
    const bannerTxt = result.valid ? [6, 95, 70] : [153, 27, 27];
    doc.setFillColor(...bannerBg);
    doc.rect(0, 24, pageW, 9, 'F');
    doc.setTextColor(...bannerTxt);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(
      result.valid
        ? 'VÁLIDO — Nenhuma irregularidade encontrada.'
        : `INVÁLIDO — ${result.errors.length} irregularidade(s) detectada(s).`,
      10, 30,
    );

    let cursorY = 36;

    // Metadata table
    const { summary, layers } = result;
    const META_ROWS = [
      ['Arquivo',         summary?.arquivo    ?? '—'],
      ['Versão TISS',     summary?.versao     ?? '—'],
      ['Número do Lote',  summary?.lote       ?? '—'],
      ['Operadora (ANS)', summary?.operadora  ?? '—'],
      ['Tipo de Guia',    summary?.tipoGuia   ?? '—'],
      ['Total de Guias',  String(summary?.totalGuias ?? '—')],
      ['Valor Total',     summary?.valorTotal ?? '—'],
    ];

    autoTable(doc, {
      startY: cursorY,
      head: [['Campo', 'Valor']],
      body: META_ROWS,
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 45, fontStyle: 'bold', textColor: [71, 85, 105] },
        1: { cellWidth: 'auto', textColor: [30, 41, 59] },
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    cursorY = doc.lastAutoTable.finalY + 6;

    // Layers
    const LAYER_LABELS = { schema: 'Estrutura XSD', hash: 'Integridade MD5', audit: 'Auditoria Matemática' };
    autoTable(doc, {
      startY: cursorY,
      head: [['Camada de Validação', 'Resultado', 'Erros']],
      body: Object.entries(layers ?? {}).map(([key, l]) => [
        LAYER_LABELS[key] ?? key,
        l.status === 'OK' ? 'APROVADO' : 'REPROVADO',
        String(l.errorCount ?? 0),
      ]),
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        1: { halign: 'center', fontStyle: 'bold' },
        2: { halign: 'center' },
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      didParseCell(data) {
        if (data.section === 'body' && data.column.index === 1) {
          data.cell.styles.textColor =
            data.cell.raw === 'APROVADO' ? [6, 95, 70] : [153, 27, 27];
        }
      },
    });

    cursorY = doc.lastAutoTable.finalY + 6;

    // Errors detail
    if (result.errors.length > 0) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(51, 65, 85);
      doc.text('Detalhamento das Falhas', 10, cursorY + 4);
      cursorY += 8;

      autoTable(doc, {
        startY: cursorY,
        head: [['#', 'Camada', 'Código', 'Descrição', 'Detalhes']],
        body: result.errors.map((e, i) => [
          String(i + 1),
          LAYER_LABELS[e.layer] ?? e.layer,
          e.code,
          e.description,
          e.details ?? '',
        ]),
        styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak', textColor: [30, 41, 59] },
        headStyles: { fillColor: [220, 38, 38], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
        columnStyles: {
          0: { cellWidth: 8,  halign: 'center' },
          1: { cellWidth: 28 },
          2: { cellWidth: 44, font: 'courier', fontSize: 6, textColor: [153, 27, 27] },
          3: { cellWidth: 'auto' },
          4: { cellWidth: 40, font: 'courier', fontSize: 6, textColor: [100, 116, 139] },
        },
        alternateRowStyles: { fillColor: [254, 242, 242] },
      });
    }

    // Footer on every page
    const total = doc.internal.getNumberOfPages();
    for (let p = 1; p <= total; p++) {
      doc.setPage(p);
      const pH = doc.internal.pageSize.getHeight();
      doc.setFillColor(248, 250, 252);
      doc.rect(0, pH - 8, pageW, 8, 'F');
      doc.setTextColor(148, 163, 184);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.text('TISSflow · Relatório de Validação — confidencial, gerado automaticamente.', 10, pH - 3);
      doc.text(`Página ${p} de ${total}`, pageW - 10, pH - 3, { align: 'right' });
    }

    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\.xml$/i, '');
    doc.save(`tiss-validacao-${safeName}.pdf`);
    toast.success('Relatório PDF exportado com sucesso.');
  } catch (err) {
    console.error('[exportPdf]', err);
    toast.error('Erro ao gerar o PDF. Tente novamente.');
  }
}

// ── XML download helper ────────────────────────────────────────────────────────

function downloadXml(xmlString, fileName) {
  const blob = new Blob([xmlString], { type: 'application/xml' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = fileName.replace(/\.xml$/i, '_corrigido.xml');
  a.click();
  URL.revokeObjectURL(url);
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function TissValidator() {
  const navigate = useNavigate();
  const location = useLocation();

  // State can be pre-populated when returning from XmlEditor with a fixed XML
  const [loading,     setLoading]     = useState(false);
  const [result,      setResult]      = useState(() => location.state?.result   ?? null);
  const [fileName,    setFileName]    = useState(() => location.state?.fileName ?? '');
  const [rawXml,      setRawXml]      = useState(() => location.state?.xml      ?? '');
  const [fixedXml,    setFixedXml]    = useState(() => location.state?.fixedXml ?? null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [exporting,   setExporting]   = useState(false);

  // Clear location.state after reading so a page refresh doesn't re-apply it
  useEffect(() => {
    if (location.state) window.history.replaceState({}, '', location.pathname);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    if (!/\.xml$/i.test(file.name)) {
      toast.error('Apenas arquivos .xml são aceitos.');
      return;
    }

    // Read raw text (needed for the XmlEditor flow)
    const xmlText = await file.text();
    setRawXml(xmlText);
    setFixedXml(null);
    setFileName(file.name);
    setLoading(true);
    setResult(null);

    const form = new FormData();
    form.append('xml_file', file);

    try {
      const { data } = await api.post('/tools/validator/validate-file', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(data);
      if (data.valid) {
        toast.success('Arquivo válido — nenhuma irregularidade encontrada!');
      } else {
        toast.warning(`${data.errors.length} irregularidade(s) encontrada(s).`);
      }
    } catch (err) {
      const msg = err.response?.data?.error ?? 'Erro ao processar o XML.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleReset() {
    setResult(null);
    setFileName('');
    setRawXml('');
    setFixedXml(null);
  }

  async function handleExportPdf() {
    if (!result || !fileName) return;
    setExporting(true);
    await exportPdf(result, fileName);
    setExporting(false);
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto flex flex-col gap-6">

        {/* Page header */}
        <div>
          <div className="flex items-center justify-between mb-1 flex-wrap gap-3">
            <div className="flex items-center gap-2.5">
              <ShieldCheck size={20} className="text-blue-500" />
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">Validador Analítico TISS</h1>
              <button
                onClick={() => setIsGuideOpen(true)}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400
                           hover:text-blue-600 dark:hover:text-blue-400 transition-colors px-2 py-1
                           rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <BookOpen size={13} />
                Como Usar
              </button>
            </div>

            {result && (
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl
                             bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400
                             hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  <RefreshCw size={13} />
                  Novo Arquivo
                </button>

                {/* Visualizar e Corrigir — only when file has errors */}
                {!result.valid && rawXml && (
                  <button
                    onClick={() => navigate('/tools/tiss-validator/editor', {
                      state: { xml: rawXml, errors: result.errors, fileName },
                    })}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl
                               bg-amber-500 hover:bg-amber-400 text-white transition-all"
                  >
                    <Wand2 size={13} />
                    Visualizar e Corrigir
                  </button>
                )}

                {/* Download fixed XML — only when editor returned a corrected file */}
                {fixedXml && (
                  <button
                    onClick={() => downloadXml(fixedXml, fileName)}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl
                               bg-emerald-600 hover:bg-emerald-700 text-white transition-all"
                  >
                    <FileCheck2 size={13} />
                    Baixar XML Corrigido
                  </button>
                )}

                <button
                  onClick={handleExportPdf}
                  disabled={exporting}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl
                             bg-blue-600 hover:bg-blue-700 text-white transition-all
                             disabled:opacity-60 disabled:cursor-wait"
                >
                  {exporting
                    ? <Loader2 size={13} className="animate-spin" />
                    : <Download size={13} />
                  }
                  Baixar Relatório
                </button>
              </div>
            )}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Valida XMLs TISS em 3 camadas independentes: conformidade estrutural XSD, integridade hash MD5 e auditoria matemática de guias.
          </p>
        </div>

        {/* Upload zone or result */}
        {!result ? (
          <ValidatorDropzone onFile={handleFile} loading={loading} />
        ) : (
          <SummaryCard result={result} fileName={fileName} />
        )}

        {/* Informational footer chips */}
        {!result && !loading && (
          <div className="flex flex-wrap gap-3 text-xs">
            {[
              { Icon: ScanSearch,  color: 'blue',   label: 'Camada 1',  sub: 'Estrutura XSD'         },
              { Icon: Hash,        color: 'purple',  label: 'Camada 2',  sub: 'Integridade MD5'       },
              { Icon: Calculator,  color: 'amber',   label: 'Camada 3',  sub: 'Auditoria Matemática'  },
            ].map(({ Icon, color, label, sub }) => (
              <div key={sub}
                   className="flex items-center gap-2 px-3 py-2 rounded-xl
                              bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <Icon size={14} className={`text-${color}-500`} />
                <span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{label} — </span>
                  <span className="text-slate-500 dark:text-slate-400">{sub}</span>
                </span>
              </div>
            ))}

            {/* Public API teaser chip */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl
                            bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 opacity-60">
              <ShieldAlert size={14} className="text-slate-400" />
              <span>
                <span className="font-semibold text-slate-500 dark:text-slate-400">API B2B — </span>
                <span className="text-slate-400 dark:text-slate-500">POST /api/v1/public/validate (Em breve)</span>
              </span>
            </div>
          </div>
        )}

      </div>

      {isGuideOpen && (
        <GuideModal
          guide={TOOL_GUIDES['tiss-validator']}
          onClose={() => setIsGuideOpen(false)}
        />
      )}
    </DashboardLayout>
  );
}
