import { useState, useCallback, useRef, useEffect } from 'react';
import { Download, Save, RefreshCw, Loader2, Code2, AlertCircle, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '../../../components/DashboardLayout';
import GuideModal from '../../../components/Modals/GuideModal';
import { TOOL_GUIDES } from '../../../config/toolGuides';
import api from '../../../services/api';
import IdeDropzone from './IdeDropzone';
import TreePane from './TreePane';
import XmlEditorPane from './XmlEditorPane';
import SaveDocumentModal from './SaveDocumentModal';

// ── Helpers ───────────────────────────────────────────────────────────────────

function updateNodeById(node, id, updater) {
  if (node.id === id) return updater(node);
  if (!node.children?.length) return node;
  return { ...node, children: node.children.map(c => updateNodeById(c, id, updater)) };
}

// Guarantee <epilogo> is always the last child of the root mensagemTISS node,
// regardless of the order in which choice branches were resolved by the parser.
function pinEpilogoLast(tree) {
  if (!tree?.children?.length) return tree;
  const rest     = tree.children.filter(c => c.tag !== 'epilogo');
  const epilogos = tree.children.filter(c => c.tag === 'epilogo');
  return { ...tree, children: [...rest, ...epilogos] };
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function TissIde() {
  const [phase,        setPhase]        = useState('dropzone'); // 'dropzone' | 'loading' | 'ide'
  const [parseResult,  setParseResult]  = useState(null);
  const [tree,         setTree]         = useState(null);
  const [xmlString,    setXmlString]    = useState('');
  const [fileName,     setFileName]     = useState('');
  const [isDirty,      setIsDirty]      = useState(false);
  const [isSaving,     setIsSaving]     = useState(false);
  const [isRebuilding, setIsRebuilding] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [isGuideOpen,  setIsGuideOpen]  = useState(false);
  const [isDark,       setIsDark]       = useState(
    () => document.documentElement.classList.contains('dark')
  );

  // Sync control refs — prevent tree↔editor feedback loops
  const editorIsLeading = useRef(false);
  const isInitialLoad   = useRef(false);
  const prologRef       = useRef('');
  const rebuildTimer    = useRef(null);
  const parseTimer      = useRef(null);

  // Watch dark mode changes toggled by DashboardLayout
  useEffect(() => {
    const obs = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    obs.observe(document.documentElement, { attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  // Keep prolog ref in sync (doesn't change after initial parse)
  useEffect(() => {
    prologRef.current = parseResult?.metadata?.prolog ?? '';
  }, [parseResult]);

  // ── Tree → XML (debounced rebuild via backend) ──────────────────────────────
  useEffect(() => {
    if (isInitialLoad.current) { isInitialLoad.current = false; return; }
    if (editorIsLeading.current || !tree || !parseResult) return;

    clearTimeout(rebuildTimer.current);
    setIsRebuilding(true);
    rebuildTimer.current = setTimeout(async () => {
      try {
        const { data } = await api.post('/tools/ide/rebuild', {
          tree,
          prolog: prologRef.current,
        });
        setXmlString(data.xml);
      } catch {
        // silent — tree edits are still preserved locally
      } finally {
        setIsRebuilding(false);
      }
    }, 400);
  }, [tree]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Upload ──────────────────────────────────────────────────────────────────
  const handleFile = useCallback(async (file) => {
    if (!file) return;
    if (!/\.xml$/i.test(file.name)) {
      toast.error('Apenas arquivos .xml são aceitos.');
      return;
    }
    setFileName(file.name);
    setPhase('loading');
    setIsDirty(false);

    const form = new FormData();
    form.append('xml_file', file);

    try {
      const { data } = await api.post('/tools/ide/parse', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      isInitialLoad.current = true;
      setParseResult(data);
      setTree(pinEpilogoLast(data.tree));
      setXmlString(data.xmlOriginal ?? '');
      setPhase('ide');
      const errCount = data.errors?.length ?? 0;
      if (errCount > 0) {
        toast.warning(`Carregado com ${errCount} erro(s) de validação.`);
      } else {
        toast.success('XML TISS carregado e validado com sucesso.');
      }
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Erro ao processar o XML.');
      setPhase('dropzone');
    }
  }, []);

  // ── Tree mutations ──────────────────────────────────────────────────────────
  const handleValueChange = useCallback((node, newVal) => {
    setIsDirty(true);
    setTree(prev => updateNodeById(prev, node.id, n => ({
      ...n,
      value:  newVal,
      status: newVal ? (n.errors?.length ? 'error' : 'valid') : 'empty',
    })));
  }, []);

  const handleToggleEnabled = useCallback((node) => {
    setIsDirty(true);
    setTree(prev => updateNodeById(prev, node.id, n => ({
      ...n,
      isEnabled: !n.isEnabled,
    })));
  }, []);

  const handleInsert = useCallback((node) => {
    setIsDirty(true);
    setTree(prev => updateNodeById(prev, node.id, n => ({
      ...n,
      isPresent: true,
      isEnabled: true,
      value:     '',
      status:    'empty',
    })));
  }, []);

  // ── Editor → Tree (debounced re-parse) ─────────────────────────────────────
  const handleEditorChange = useCallback((newXml) => {
    setXmlString(newXml ?? '');
    setIsDirty(true);

    clearTimeout(parseTimer.current);
    parseTimer.current = setTimeout(async () => {
      try {
        const blob = new Blob([newXml ?? ''], { type: 'text/xml' });
        const form = new FormData();
        form.append('xml_file', blob, fileName || 'documento.xml');
        const { data } = await api.post('/tools/ide/parse', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        editorIsLeading.current = true;
        setParseResult(data);
        setTree(pinEpilogoLast(data.tree));
        requestAnimationFrame(() => { editorIsLeading.current = false; });
      } catch {
        // silent — editor XML may be temporarily malformed
      }
    }, 1200);
  }, [fileName]);

  // ── Download ────────────────────────────────────────────────────────────────
  function handleDownload() {
    const blob = new Blob([xmlString], { type: 'text/xml;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = fileName
      ? fileName.replace(/\.xml$/i, '_corrigido.xml')
      : 'documento_tiss.xml';
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Cloud save (opens modal) ────────────────────────────────────────────────
  function handleSaveClick() {
    setSaveModalOpen(true);
  }

  async function handleSaveConfirm({ filename, description }) {
    setIsSaving(true);
    try {
      await api.post('/tools/ide/documents', {
        filename:     filename || fileName || 'documento_tiss.xml',
        rawXml:       xmlString,
        versao:       parseResult?.metadata?.versao ?? '',
        tipoTransacao: parseResult?.metadata?.tipoTransacao ?? '',
        errorCount:   parseResult?.errors?.length ?? 0,
        description,
      });
      setIsDirty(false);
      setSaveModalOpen(false);
      toast.success('Documento salvo na nuvem.');
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Erro ao salvar documento.');
    } finally {
      setIsSaving(false);
    }
  }

  // ── Reset ───────────────────────────────────────────────────────────────────
  function handleReset() {
    clearTimeout(rebuildTimer.current);
    clearTimeout(parseTimer.current);
    setPhase('dropzone');
    setParseResult(null);
    setTree(null);
    setXmlString('');
    setFileName('');
    setIsDirty(false);
    setSaveModalOpen(false);
  }

  // ── Dropzone ────────────────────────────────────────────────────────────────
  if (phase === 'dropzone') {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto flex flex-col gap-6">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <Code2 size={20} className="text-blue-500" />
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">IDE Interativa TISS</h1>
              <button
                onClick={() => setIsGuideOpen(true)}
                className="ml-2 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold
                           text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400
                           hover:bg-slate-100 dark:hover:bg-slate-800
                           border border-slate-200 dark:border-slate-700/60 transition-all duration-200"
              >
                <BookOpen size={13} />
                Como Usar
              </button>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Edite, valide e corrija XMLs TISS com validação em tempo real via XSD oficial da ANS.
            </p>
          </div>
          <IdeDropzone onFile={handleFile} />
        </div>
        {isGuideOpen && (
          <GuideModal guide={TOOL_GUIDES['tiss-ide']} onClose={() => setIsGuideOpen(false)} />
        )}
      </DashboardLayout>
    );
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-full gap-5">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-2xl bg-blue-500/10 border border-blue-500/20
                            flex items-center justify-center">
              <Code2 size={26} className="text-blue-500" />
            </div>
            <div className="absolute inset-0 rounded-2xl border-2
                            border-t-blue-500 border-r-transparent
                            border-b-transparent border-l-transparent animate-spin" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Analisando schema XSD da ANS…
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-mono">{fileName}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ── IDE ─────────────────────────────────────────────────────────────────────
  const errCount   = parseResult?.errors?.length ?? 0;
  const errorLines = parseResult?.errors?.map(e => e.lineNumber).filter(Boolean) ?? [];

  return (
    <DashboardLayout>
      {/* -m-6 cancels DashboardLayout's p-6 so IDE fills the full viewport */}
      <div className="flex flex-col -m-6 overflow-hidden" style={{ height: 'calc(100vh - 64px)' }}>

        {/* ── Toolbar ───────────────────────────────────────────── */}
        <div className="shrink-0 flex flex-wrap items-center gap-3 px-5 py-2.5
                        border-b border-slate-200 dark:border-slate-800/60
                        bg-white dark:bg-slate-950/80">

          <Code2 size={15} className="text-blue-500 shrink-0" />

          <span className="text-xs font-mono text-slate-500 dark:text-slate-500 truncate max-w-[180px]">
            {fileName}
          </span>

          {parseResult?.metadata?.versao && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold
                             bg-blue-500/10 text-blue-700 dark:text-blue-400
                             border border-blue-400/30">
              TISS {parseResult.metadata.versao}
            </span>
          )}

          {isRebuilding && (
            <span className="flex items-center gap-1 text-[10px] text-slate-400">
              <Loader2 size={10} className="animate-spin" />
              sincronizando…
            </span>
          )}

          {errCount > 0 && (
            <span className="flex items-center gap-1.5 text-[10px] font-medium
                             text-red-600 dark:text-red-400
                             bg-red-500/10 border border-red-400/20 px-2 py-1 rounded-lg">
              <AlertCircle size={10} />
              {errCount} erro{errCount !== 1 ? 's' : ''}
            </span>
          )}

          {isDirty && (
            <span className="text-[10px] text-amber-600 dark:text-amber-400 italic">
              alterações não salvas
            </span>
          )}

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                         text-slate-600 dark:text-slate-400
                         bg-slate-100 dark:bg-slate-800/60
                         border border-slate-300 dark:border-slate-700/60
                         hover:bg-slate-200 dark:hover:bg-slate-700/60 transition-all"
            >
              <RefreshCw size={11} />
              Novo arquivo
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                         text-slate-600 dark:text-slate-400
                         bg-slate-100 dark:bg-slate-800/60
                         border border-slate-300 dark:border-slate-700/60
                         hover:bg-slate-200 dark:hover:bg-slate-700/60 transition-all"
            >
              <Download size={11} />
              Download XML
            </button>

            <button
              onClick={handleSaveClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                         text-white bg-blue-600 hover:bg-blue-500
                         transition-all duration-150"
            >
              <Save size={11} />
              Salvar na nuvem
            </button>
          </div>
        </div>

        {/* ── Split screen ──────────────────────────────────────── */}
        <div className="flex-1 flex overflow-hidden">

          {/* Left: accordion tree pane */}
          <div className="w-1/2 shrink-0 border-r border-slate-200 dark:border-slate-800/60
                          bg-slate-50/80 dark:bg-slate-950/50 overflow-hidden">
            <TreePane
              tree={tree}
              onValueChange={handleValueChange}
              onToggleEnabled={handleToggleEnabled}
              onInsert={handleInsert}
            />
          </div>

          {/* Right: Monaco XML editor */}
          <div className="flex-1 min-w-0 overflow-hidden">
            <XmlEditorPane
              xmlString={xmlString}
              errorLines={errorLines}
              isDark={isDark}
              onChange={handleEditorChange}
            />
          </div>
        </div>
      </div>

      {/* ── Save modal ────────────────────────────────────────── */}
      <SaveDocumentModal
        open={saveModalOpen}
        onClose={() => !isSaving && setSaveModalOpen(false)}
        onSave={handleSaveConfirm}
        defaultFilename={fileName || 'documento_tiss.xml'}
        isSaving={isSaving}
      />
    </DashboardLayout>
  );
}
