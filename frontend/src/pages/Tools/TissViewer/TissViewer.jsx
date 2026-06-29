import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import DashboardLayout from '../../../components/DashboardLayout';
import api             from '../../../services/api';
import Dropzone        from './Dropzone';
import BatchNav        from './BatchNav';
import GuiaViewer      from './GuiaViewer';
import XmlDrawer       from './XmlDrawer';
import {
  FileCode2, RefreshCw, Code2,
  BadgeCheck, AlertTriangle, ChevronRight, BookOpen,
} from 'lucide-react';
import GuideModal from '../../../components/Modals/GuideModal';
import { TOOL_GUIDES } from '../../../config/toolGuides';

// ── Badges ────────────────────────────────────────────────────────────────────

function VersionBadge({ versao }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold
                     bg-blue-500/10 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400
                     border border-blue-400/30">
      <BadgeCheck size={11} />
      TISS {versao || '—'}
    </span>
  );
}

function TxBadge({ label }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold
                     bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400
                     border border-slate-300 dark:border-slate-700/60">
      {label || '—'}
    </span>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function TissViewer() {
  const [loading,      setLoading]      = useState(false);
  const [result,       setResult]       = useState(null);   // parsed data
  const [selectedGuia, setSelectedGuia] = useState(null);
  const [xmlDrawerOpen, setXmlDrawerOpen] = useState(false);
  const [fileName,     setFileName]     = useState('');
  const [isGuideOpen,  setIsGuideOpen]  = useState(false);

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    if (!/\.xml$/i.test(file.name)) {
      toast.error('Apenas arquivos .xml são aceitos.');
      return;
    }
    setFileName(file.name);
    setLoading(true);
    setResult(null);
    setSelectedGuia(null);

    const form = new FormData();
    form.append('xml_file', file);

    try {
      const { data } = await api.post('/tools/viewer/parse', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(data);
      if (data.guias?.length > 0) setSelectedGuia(data.guias[0]);
      if (data.warnings?.length > 0) {
        toast.warning(`${data.warnings.length} aviso(s) estrutural(is) encontrado(s).`);
      } else {
        toast.success(`${data.totalGuias} guia(s) processada(s) com sucesso.`);
      }
    } catch (err) {
      const msg = err.response?.data?.error ?? 'Erro ao processar o XML.';
      toast.error(msg);
      setLoading(false);
      return;
    }
    setLoading(false);
  }, []);

  function handleReset() {
    setResult(null);
    setSelectedGuia(null);
    setXmlDrawerOpen(false);
    setFileName('');
  }

  // ── Dropzone state ────────────────────────────────────────────────────────
  if (!result && !loading) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto flex flex-col gap-6">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <FileCode2 size={20} className="text-blue-500" />
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">Visualizador TISS</h1>
              <button
                onClick={() => setIsGuideOpen(true)}
                className="ml-2 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold
                           bg-blue-50 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400
                           border border-blue-200 dark:border-blue-500/30
                           hover:bg-blue-100 dark:hover:bg-blue-600/20 transition-all duration-200"
              >
                <BookOpen size={13} />
                Como Usar
              </button>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Faça upload de um XML TISS para visualizar os dados humanizados das guias.
            </p>
          </div>
          <Dropzone onFile={handleFile} />
        </div>
        {isGuideOpen && (
          <GuideModal guide={TOOL_GUIDES['tiss-viewer']} onClose={() => setIsGuideOpen(false)} />
        )}
      </DashboardLayout>
    );
  }

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-full gap-5">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <FileCode2 size={26} className="text-blue-500" />
            </div>
            <div className="absolute inset-0 rounded-2xl border-2 border-t-blue-500 border-r-transparent
                            border-b-transparent border-l-transparent animate-spin" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Analisando estrutura da ANS…</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-mono">{fileName}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ── Result state ──────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      {/* -m-6 cancels DashboardLayout p-6 */}
      <div className="flex flex-col overflow-hidden -m-6" style={{ height: 'calc(100vh - 64px)' }}>

        {/* ── Top bar ──────────────────────────────────────────── */}
        <div className="shrink-0 flex flex-wrap items-center gap-3 px-5 py-3
                        border-b border-slate-200 dark:border-slate-800/60
                        bg-white dark:bg-slate-950/80">
          <FileCode2 size={15} className="text-blue-500 shrink-0" />
          <span className="text-xs font-mono text-slate-500 dark:text-slate-500 truncate max-w-[200px]">
            {fileName}
          </span>
          <ChevronRight size={12} className="text-slate-300 dark:text-slate-700 shrink-0" />
          <VersionBadge versao={result.versao} />
          <TxBadge label={result.tipoTransacaoLabel} />

          {result.cnpjPrestador && (
            <span className="text-[11px] text-slate-500 dark:text-slate-500 font-mono hidden sm:inline">
              CNPJ: {result.cnpjPrestador}
            </span>
          )}
          {result.dataRegistro && (
            <span className="text-[11px] text-slate-400 dark:text-slate-600 hidden sm:inline">
              {result.dataRegistro}
            </span>
          )}

          {result.warnings?.length > 0 && (
            <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400
                            bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg">
              <AlertTriangle size={11} />
              {result.warnings.length} aviso{result.warnings.length !== 1 ? 's' : ''}
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setXmlDrawerOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                         text-slate-600 dark:text-slate-400
                         bg-slate-100 dark:bg-slate-800/60
                         border border-slate-300 dark:border-slate-700/60
                         hover:bg-slate-200 dark:hover:bg-slate-700/60 transition-all duration-150"
            >
              <Code2 size={12} />
              XML Bruto
            </button>
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                         text-blue-600 dark:text-blue-400
                         bg-blue-500/10 border border-blue-500/20
                         hover:bg-blue-500/20 transition-all duration-150"
            >
              <RefreshCw size={12} />
              Novo arquivo
            </button>
          </div>
        </div>

        {/* ── Main content ─────────────────────────────────────── */}
        <div className="flex-1 flex overflow-hidden">

          {/* Left: batch navigator */}
          <div className="w-56 shrink-0 border-r border-slate-200 dark:border-slate-800/60
                          bg-white dark:bg-slate-950/70 overflow-y-auto">
            <BatchNav
              guias={result.guias}
              selected={selectedGuia}
              onSelect={setSelectedGuia}
            />
          </div>

          {/* Center: guia viewer */}
          <div className="flex-1 min-w-0 overflow-y-auto bg-slate-50 dark:bg-slate-950/40 p-5">
            {selectedGuia
              ? <GuiaViewer guia={selectedGuia} warnings={result.warnings} />
              : (
                <div className="flex items-center justify-center h-full text-slate-400 dark:text-slate-600 text-sm">
                  Selecione uma guia no painel lateral.
                </div>
              )
            }
          </div>
        </div>
      </div>

      {/* XML Drawer (overlay) */}
      <XmlDrawer
        xml={result.xmlOriginal}
        open={xmlDrawerOpen}
        onClose={() => setXmlDrawerOpen(false)}
      />
    </DashboardLayout>
  );
}
