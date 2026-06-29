import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ChevronDown, GitBranch, Loader2, CheckSquare, Square,
  Code2, FileJson, Zap, AlertCircle, BookOpen,
} from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '../../../components/DashboardLayout';
import GuideModal from '../../../components/Modals/GuideModal';
import { TOOL_GUIDES } from '../../../config/toolGuides';
import api from '../../../services/api';
import GenTreeNode from './GenTreeNode';
import OutputModal from './OutputModal';

// ── Static transaction types ───────────────────────────────────────────────

const TRANSACTION_TYPES = [
  {
    value:       'ENVIO_LOTE_GUIAS',
    label:       'Envio de Lote de Guias',
    description: 'Guias de SP, SADT, Internação, Honorários',
  },
  {
    value:       'ENVIO_RECURSO_GLOSA',
    label:       'Recurso de Glosa',
    description: 'Contestação de glosas de guias processadas',
  },
  {
    value:       'SOLICITACAO_ELEGIBILIDADE',
    label:       'Solicitação de Elegibilidade',
    description: 'Consulta de elegibilidade de beneficiário',
  },
  {
    value:       'RESPOSTA_ELEGIBILIDADE',
    label:       'Resposta de Elegibilidade',
    description: 'Resposta da operadora para consulta de elegibilidade',
  },
  {
    value:       'AUTORIZACAO_SOLICITACAO',
    label:       'Autorização de Solicitação',
    description: 'Resposta de autorização/negativa da operadora',
  },
];

// ── Shared select style ────────────────────────────────────────────────────

const SELECT_CLASS = [
  'w-full appearance-none text-xs rounded-xl px-3 py-2.5 pr-8',
  'bg-slate-800/80 border border-slate-700/60 text-slate-200',
  'focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/40',
  'transition-all duration-200 disabled:opacity-40 cursor-pointer',
].join(' ');

// ── Component ──────────────────────────────────────────────────────────────

export default function TissGenerator() {
  const [versions,          setVersions]          = useState([]);
  const [selectedVersionId, setSelectedVersionId] = useState(null);
  const [selectedType,      setSelectedType]      = useState('');

  const [rootNode,          setRootNode]          = useState(null);
  const [nodeCache,         setNodeCache]         = useState({});
  const [checkedOptionals,  setCheckedOptionals]  = useState(new Set());

  const [loadingVersions,   setLoadingVersions]   = useState(true);
  const [loadingEntry,      setLoadingEntry]      = useState(false);
  const [entryError,        setEntryError]        = useState(null);
  const [generating,        setGenerating]        = useState(false);
  const [modal,             setModal]             = useState(null);
  const [isGuideOpen,       setIsGuideOpen]       = useState(false);

  const seenOptionalsRef = useRef(new Set());

  // ── Load versions ────────────────────────────────────────────────────
  useEffect(() => {
    api.get('/tools/swagger/versions')
      .then(({ data }) => setVersions(data.versions))
      .catch((err) => toast.error(err.response?.data?.error ?? 'Erro ao carregar versões TISS.'))
      .finally(() => setLoadingVersions(false));
  }, []);

  // ── Load entry node when version + type are both set ─────────────────
  useEffect(() => {
    setRootNode(null);
    setNodeCache({});
    setCheckedOptionals(new Set());
    setEntryError(null);
    seenOptionalsRef.current = new Set();

    if (!selectedVersionId || !selectedType) return;

    setLoadingEntry(true);
    api.get(`/tools/generator/entry-node?version_id=${selectedVersionId}&transaction_type=${selectedType}`)
      .then(({ data }) => {
        setRootNode({ ...data.node, path: data.node.name });
      })
      .catch((err) => {
        const msg = err?.response?.data?.error ?? 'Transação não disponível nesta versão.';
        setEntryError(msg);
      })
      .finally(() => setLoadingEntry(false));
  }, [selectedVersionId, selectedType]);

  // ── Lazy expand ──────────────────────────────────────────────────────
  const handleExpand = useCallback(async (node, state) => {
    if (state.isLoading) return;
    if (state.isOpen) {
      setNodeCache((p) => ({ ...p, [node.path]: { ...p[node.path], isOpen: false } }));
      return;
    }
    if (state.children !== null) {
      setNodeCache((p) => ({ ...p, [node.path]: { ...p[node.path], isOpen: true } }));
      return;
    }

    setNodeCache((p) => ({ ...p, [node.path]: { ...p[node.path], isOpen: true, isLoading: true } }));
    try {
      const { data } = await api.get(
        `/tools/swagger/tree?version_id=${selectedVersionId}&node_path=${encodeURIComponent(node.type)}`,
      );
      const raw      = Array.isArray(data) ? data : (Array.isArray(data.children) ? data.children : []);
      const children = raw.map((c) => ({ ...c, path: `${node.path}.${c.name}` }));

      const newOpts = [];
      for (const c of children) {
        if (c.minOccurs === '0' || Number(c.minOccurs) === 0) {
          seenOptionalsRef.current.add(c.path);
          newOpts.push(c.path);
        }
      }

      setNodeCache((p) => ({ ...p, [node.path]: { isOpen: true, children, isLoading: false } }));
      if (newOpts.length > 0) {
        setCheckedOptionals((prev) => {
          const next = new Set(prev);
          for (const p of newOpts) next.add(p);
          return next;
        });
      }
    } catch {
      setNodeCache((p) => ({ ...p, [node.path]: { isOpen: false, children: null, isLoading: false } }));
    }
  }, [selectedVersionId]);

  // ── Toggle optional (with cascade uncheck for loaded descendants) ────
  const handleToggle = useCallback((path, isCurrentlyChecked) => {
    setCheckedOptionals((prev) => {
      const next = new Set(prev);
      if (isCurrentlyChecked) {
        next.delete(path);
        for (const p of seenOptionalsRef.current) {
          if (p.startsWith(path + '.')) next.delete(p);
        }
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  function handleMarkAll()   { setCheckedOptionals(new Set(seenOptionalsRef.current)); }
  function handleUnmarkAll() { setCheckedOptionals(new Set()); }

  // ── Generate ─────────────────────────────────────────────────────────
  async function handleGenerate(format) {
    if (!selectedVersionId || !selectedType) {
      toast.error('Selecione a versão e o tipo de transação.');
      return;
    }
    setGenerating(true);
    try {
      const { data } = await api.post('/tools/generator/generate', {
        version_id:            Number(selectedVersionId),
        transaction_type:      selectedType,
        active_optional_paths: Array.from(checkedOptionals),
      });
      setModal({ xml: data.xml, json: data.json, tab: format });
    } catch (err) {
      toast.error(err?.response?.data?.error ?? 'Erro ao gerar amostra.');
    } finally {
      setGenerating(false);
    }
  }

  // ── Derived state ─────────────────────────────────────────────────────
  const selectedTypeMeta   = TRANSACTION_TYPES.find((t) => t.value === selectedType);
  const canGenerate        = !!rootNode && !loadingEntry && !entryError;

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="flex overflow-hidden -m-6" style={{ height: 'calc(100vh - 64px)' }}>

        {/* ── Left sidebar ──────────────────────────────────────── */}
        <div className="w-60 shrink-0 border-r border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-950/70 flex flex-col">

          <div className="shrink-0 px-4 py-3 border-b border-slate-200 dark:border-slate-800/60 flex items-center justify-between">
            <span className="text-[9px] font-mono font-bold text-slate-500 dark:text-slate-600 uppercase tracking-[0.15em]">
              Gerador de Amostras
            </span>
            <button
              onClick={() => setIsGuideOpen(true)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-semibold
                         bg-blue-50 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400
                         border border-blue-200 dark:border-blue-500/30
                         hover:bg-blue-100 dark:hover:bg-blue-600/20 transition-all duration-200"
            >
              <BookOpen size={11} />
              Como Usar
            </button>
          </div>

          <div className="flex flex-col gap-5 p-4 flex-1 overflow-y-auto">

            {/* Version */}
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5 block">
                1. Versão TISS
                {loadingVersions && <Loader2 size={9} className="animate-spin text-slate-600" />}
              </label>
              <div className="relative">
                <select
                  value={selectedVersionId ?? ''}
                  onChange={(e) => setSelectedVersionId(e.target.value || null)}
                  disabled={loadingVersions}
                  className={SELECT_CLASS}
                >
                  <option value="">Selecionar...</option>
                  {versions.map((v) => (
                    <option key={v.id} value={v.id}>TISS {v.version}</option>
                  ))}
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              </div>
            </div>

            {/* Transaction type */}
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
                2. Tipo de Transação
              </label>
              <div className="relative">
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  disabled={!selectedVersionId}
                  className={SELECT_CLASS}
                >
                  <option value="">Selecionar...</option>
                  {TRANSACTION_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              </div>
              {selectedTypeMeta && (
                <p className="mt-1.5 text-[10px] text-slate-600 leading-relaxed">
                  {selectedTypeMeta.description}
                </p>
              )}
            </div>

            {/* Optional controls */}
            {canGenerate && (
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">
                  Campos Opcionais
                </span>
                <button
                  type="button"
                  onClick={handleMarkAll}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-[11px] font-medium
                             text-blue-400 bg-blue-500/10 border border-blue-500/20
                             hover:bg-blue-500/20 transition-all duration-150"
                >
                  <CheckSquare size={12} />
                  Marcar todos visíveis
                </button>
                <button
                  type="button"
                  onClick={handleUnmarkAll}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-[11px] font-medium
                             text-slate-400 bg-slate-800/50 border border-slate-700/50
                             hover:bg-slate-700/50 hover:text-slate-200 transition-all duration-150"
                >
                  <Square size={12} />
                  Desmarcar todos
                </button>
              </div>
            )}

            {/* Legend */}
            <div className="flex flex-col gap-2">
              <span className="text-[9px] font-semibold text-slate-600 uppercase tracking-wider">Legenda</span>
              <div className="flex flex-col gap-1.5">
                <span className="flex items-center gap-2 text-[10px] text-slate-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                  Campo obrigatório
                </span>
                <span className="flex items-center gap-2 text-[10px] text-slate-600">
                  <span className="w-3.5 h-3.5 rounded border-2 border-blue-400 bg-blue-500 flex items-center justify-center shrink-0">
                    <svg className="w-2 h-2 text-white" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4l2.5 2.5L9 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                  Opcional incluído
                </span>
                <span className="flex items-center gap-2 text-[10px] text-slate-600">
                  <span className="w-3.5 h-3.5 rounded border-2 border-slate-600 shrink-0" />
                  Opcional excluído
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* ── Center: tree + action bar ──────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col bg-slate-50 dark:bg-slate-950/40">

          {/* Tree header */}
          <div className="shrink-0 flex items-center gap-2 px-4 py-2.5 border-b border-slate-200 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/30">
            <GitBranch size={11} className="text-slate-700 shrink-0" />
            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-600 truncate">
              {rootNode
                ? rootNode.name
                : selectedVersionId && selectedType
                  ? 'Carregando estrutura...'
                  : 'Selecione versão e tipo de transação'}
            </span>
            {checkedOptionals.size > 0 && (
              <span className="ml-auto text-[10px] font-mono text-blue-400/70 shrink-0">
                {checkedOptionals.size} opcional{checkedOptionals.size !== 1 ? 'is' : ''} incluído{checkedOptionals.size !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Tree body */}
          <div className="flex-1 overflow-y-auto p-2">

            {/* Loading */}
            {loadingEntry && (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <Loader2 size={26} className="text-slate-600 animate-spin" />
                <span className="text-xs text-slate-600">Carregando estrutura da transação...</span>
              </div>
            )}

            {/* Error */}
            {!loadingEntry && entryError && (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <AlertCircle size={20} className="text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Transação não disponível</p>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-64">{entryError}</p>
                </div>
              </div>
            )}

            {/* Empty state */}
            {!loadingEntry && !entryError && !rootNode && (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
                <div className="w-14 h-14 rounded-2xl bg-slate-200 dark:bg-slate-800/40 border border-slate-300 dark:border-slate-800/60 flex items-center justify-center">
                  <GitBranch size={22} className="text-slate-400 dark:text-slate-700" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-600">
                    {!selectedVersionId
                      ? 'Selecione uma versão TISS'
                      : 'Selecione o tipo de transação'}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-700 mt-1">
                    {!selectedVersionId
                      ? 'Escolha a versão no painel lateral'
                      : 'A árvore de campos será carregada automaticamente'}
                  </p>
                </div>
              </div>
            )}

            {/* Tree */}
            {!loadingEntry && !entryError && rootNode && (
              <GenTreeNode
                node={rootNode}
                depth={0}
                nodeCache={nodeCache}
                onExpand={handleExpand}
                checkedOptionals={checkedOptionals}
                onToggle={handleToggle}
                parentIsDisabled={false}
              />
            )}
          </div>

          {/* Action bar */}
          <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-t border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-950/70">
            <span className="text-[10px] text-slate-500 dark:text-slate-700 mr-auto truncate">
              {canGenerate
                ? `Gerando ${selectedTypeMeta?.label ?? ''} — dados fictícios contextualizados`
                : 'Configure versão e tipo de transação para habilitar'}
            </span>
            <button
              type="button"
              disabled={!canGenerate || generating}
              onClick={() => handleGenerate('xml')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border
                         bg-emerald-500/10 text-emerald-400 border-emerald-500/25
                         hover:bg-emerald-500/20 hover:text-emerald-300
                         disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
            >
              {generating ? <Loader2 size={13} className="animate-spin" /> : <Code2 size={13} />}
              Gerar XML
            </button>
            <button
              type="button"
              disabled={!canGenerate || generating}
              onClick={() => handleGenerate('json')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border
                         bg-blue-500/10 text-blue-400 border-blue-500/25
                         hover:bg-blue-500/20 hover:text-blue-300
                         disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
            >
              {generating ? <Loader2 size={13} className="animate-spin" /> : <FileJson size={13} />}
              Gerar JSON
            </button>
            {!generating && canGenerate && <Zap size={12} className="text-slate-800 shrink-0" />}
          </div>
        </div>
      </div>

      {modal && (
        <OutputModal
          xml={modal.xml}
          json={modal.json}
          initialTab={modal.tab}
          onClose={() => setModal(null)}
        />
      )}

      {isGuideOpen && (
        <GuideModal guide={TOOL_GUIDES['xml-generator']} onClose={() => setIsGuideOpen(false)} />
      )}
    </DashboardLayout>
  );
}
