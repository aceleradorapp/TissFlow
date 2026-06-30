import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ChevronDown, Loader2, AlertCircle, BookOpen, GitBranch,
  UploadCloud, FileCode2, Save, Layers, FolderOpen, X,
} from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '../../../components/DashboardLayout';
import GuideModal from '../../../components/Modals/GuideModal';
import { TOOL_GUIDES } from '../../../config/toolGuides';
import api from '../../../services/api';
import TemplateTreeNode from './TemplateTreeNode';
import CodeViewer from '../ClassGenerator/CodeViewer';
import MyModelsTab from './MyModelsTab';

// ── Static data ──────────────────────────────────────────────────────────

const TRANSACTION_TYPES = [
  { value: 'ENVIO_LOTE_GUIAS',          label: 'Envio de Lote de Guias' },
  { value: 'ENVIO_RECURSO_GLOSA',       label: 'Recurso de Glosa' },
  { value: 'SOLICITACAO_ELEGIBILIDADE', label: 'Solicitação de Elegibilidade' },
  { value: 'RESPOSTA_ELEGIBILIDADE',    label: 'Resposta de Elegibilidade' },
  { value: 'AUTORIZACAO_SOLICITACAO',   label: 'Autorização de Solicitação' },
];

const SELECT_CLASS = [
  'w-full appearance-none text-xs rounded-xl px-3 py-2.5 pr-8',
  'bg-slate-800/80 border border-slate-700/60 text-slate-200',
  'focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/40',
  'transition-all duration-200 disabled:opacity-40 cursor-pointer',
].join(' ');

const INPUT_CLASS = [
  'w-full text-xs rounded-xl px-3 py-2.5',
  'bg-slate-800/80 border border-slate-700/60 text-slate-200 placeholder:text-slate-500',
  'focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/40',
  'transition-all duration-200',
].join(' ');

// Extrai nomes de tags locais (sem prefixo de namespace) de um XML cru.
function extractTagNames(rawXml) {
  const names = new Set();
  const re = /<([A-Za-z_][\w.-]*:)?([A-Za-z_][\w.-]*)[\s/>]/g;
  let m;
  while ((m = re.exec(rawXml))) names.add(m[2]);
  return names;
}

// ── Component ────────────────────────────────────────────────────────────

export default function XmlTemplateBuilder() {
  const [activeTab, setActiveTab] = useState('builder'); // 'builder' | 'my-models'

  const [versions,          setVersions]          = useState([]);
  const [selectedVersionId, setSelectedVersionId] = useState(null);
  const [selectedType,      setSelectedType]      = useState('');

  const [rootNode,         setRootNode]         = useState(null);
  const [nodeCache,        setNodeCache]        = useState({});
  const [checkedOptionals, setCheckedOptionals] = useState(new Set());

  const [loadingVersions, setLoadingVersions] = useState(true);
  const [loadingEntry,    setLoadingEntry]    = useState(false);
  const [entryError,      setEntryError]      = useState(null);

  const [preview,        setPreview]        = useState(null);
  const [loadingPreview, setLoadingPreview]  = useState(false);

  const [templateName,        setTemplateName]        = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [uploadedFileName,    setUploadedFileName]    = useState(null);
  const [dragOver,             setDragOver]            = useState(false);
  const [saving,               setSaving]              = useState(false);

  const [isGuideOpen, setIsGuideOpen] = useState(false);

  const [myTemplates,        setMyTemplates]        = useState([]);
  const [loadingMyTemplates, setLoadingMyTemplates] = useState(false);

  const seenOptionalsRef     = useRef(new Set());
  const uploadedTagsRef      = useRef(null); // null = sem upload; Set = tags presentes no XML enviado
  const previewDebounceRef   = useRef(null);
  const pendingRestoreRef    = useRef(null); // paths a restaurar ao carregar um modelo salvo
  const isRestoredSessionRef = useRef(false); // true enquanto editamos um modelo carregado

  // ── Load versions ────────────────────────────────────────────────────
  useEffect(() => {
    api.get('/tools/xml-template-builder/versions')
      .then(({ data }) => setVersions(data.versions))
      .catch((err) => toast.error(err.response?.data?.error ?? 'Erro ao carregar versões TISS.'))
      .finally(() => setLoadingVersions(false));
  }, []);

  // ── Load my templates (for cross-tab badge + "Meus Modelos") ─────────
  const loadMyTemplates = useCallback(() => {
    setLoadingMyTemplates(true);
    api.get('/xml-templates')
      .then(({ data }) => setMyTemplates(data.templates))
      .catch(() => toast.error('Erro ao carregar seus modelos salvos.'))
      .finally(() => setLoadingMyTemplates(false));
  }, []);

  useEffect(() => {
    if (activeTab === 'my-models') loadMyTemplates();
  }, [activeTab, loadMyTemplates]);

  // ── Load entry node when version + type are both set ─────────────────
  useEffect(() => {
    setRootNode(null);
    setNodeCache({});
    setCheckedOptionals(new Set());
    setEntryError(null);
    setPreview(null);
    seenOptionalsRef.current = new Set();
    isRestoredSessionRef.current = false;

    if (!selectedVersionId || !selectedType) return;

    setLoadingEntry(true);
    api.get(`/tools/xml-template-builder/entry-node?version_id=${selectedVersionId}&transaction_type=${selectedType}`)
      .then(({ data }) => {
        setRootNode({ ...data.node, path: data.node.name });

        // Modelo carregado via "Editar": restaura exatamente os blocos ativos salvos.
        if (pendingRestoreRef.current) {
          const restored = pendingRestoreRef.current;
          pendingRestoreRef.current = null;
          isRestoredSessionRef.current = true;
          for (const p of restored) seenOptionalsRef.current.add(p);
          setCheckedOptionals(new Set(restored));
        }
      })
      .catch((err) => setEntryError(err?.response?.data?.error ?? 'Transação não disponível nesta versão.'))
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
        `/tools/xml-template-builder/tree?version_id=${selectedVersionId}&node_path=${encodeURIComponent(node.type)}`,
      );
      const raw      = Array.isArray(data) ? data : (Array.isArray(data.children) ? data.children : []);
      const children = raw.map((c) => ({ ...c, path: `${node.path}.${c.name}` }));

      const newOpts = [];
      for (const c of children) {
        if (c.minOccurs === '0' || Number(c.minOccurs) === 0) {
          seenOptionalsRef.current.add(c.path);
          // Modelo carregado via "Editar": não auto-marca novas opcionais —
          // o estado vem exclusivamente do que foi restaurado (active_optional_paths).
          if (isRestoredSessionRef.current) continue;
          // Sem upload: opcional vem marcado por padrão. Com upload: só marca se a tag existir no XML enviado.
          if (!uploadedTagsRef.current || uploadedTagsRef.current.has(c.name)) {
            newOpts.push(c.path);
          }
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

  // ── Toggle optional (com cascade-uncheck para descendentes carregados) ─
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

  // ── Live preview: regenera com debounce a cada mudança de seleção ────
  useEffect(() => {
    if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current);
    if (!selectedVersionId || !selectedType || !rootNode) return;

    previewDebounceRef.current = setTimeout(() => {
      setLoadingPreview(true);
      api.post('/tools/xml-template-builder/generate', {
        version_id:            Number(selectedVersionId),
        transaction_type:      selectedType,
        active_optional_paths: Array.from(checkedOptionals),
      })
        .then(({ data }) => setPreview(data))
        .catch(() => {})
        .finally(() => setLoadingPreview(false));
    }, 400);

    return () => clearTimeout(previewDebounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVersionId, selectedType, rootNode, checkedOptionals.size, Array.from(checkedOptionals).join(',')]);

  // ── Upload de XML (drag-and-drop) ─────────────────────────────────────
  function handleFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const tags = extractTagNames(String(reader.result));
      uploadedTagsRef.current = tags;
      isRestoredSessionRef.current = false; // upload manual passa a ser a fonte da verdade
      setUploadedFileName(file.name);
      toast.success(`Arquivo "${file.name}" analisado — ${tags.size} tags detectadas.`);

      // Reaplica o filtro de tags presentes no arquivo às opcionais já carregadas na árvore.
      setCheckedOptionals((prev) => {
        const next = new Set(prev);
        for (const path of seenOptionalsRef.current) {
          const tagName = path.split('.').pop();
          if (tags.has(tagName)) next.add(path);
          else next.delete(path);
        }
        return next;
      });
    };
    reader.readAsText(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files?.[0]);
  }

  function clearUpload() {
    uploadedTagsRef.current = null;
    setUploadedFileName(null);
  }

  // ── Salvar modelo ──────────────────────────────────────────────────────
  async function handleSave() {
    if (!templateName.trim()) { toast.error('Informe o nome do modelo.'); return; }
    if (!selectedVersionId || !selectedType) { toast.error('Selecione a versão e o serviço.'); return; }
    if (!preview) { toast.error('Aguarde a geração do preview antes de salvar.'); return; }

    const versionLabel = versions.find((v) => String(v.id) === String(selectedVersionId))?.version ?? null;

    setSaving(true);
    try {
      await api.post('/xml-templates', {
        name:            templateName.trim(),
        description:     templateDescription.trim() || null,
        version_tiss:    versionLabel,
        transacao_tipo:  selectedType,
        content: JSON.stringify({
          active_optional_paths: Array.from(checkedOptionals),
          xml:  preview.xml,
          json: preview.json,
        }),
      });
      toast.success('Modelo salvo na sua biblioteca particular.');
      setTemplateName('');
      setTemplateDescription('');
      if (activeTab === 'my-models') loadMyTemplates();
    } catch (err) {
      toast.error(err?.response?.data?.error ?? 'Erro ao salvar o modelo.');
    } finally {
      setSaving(false);
    }
  }

  // ── Carregar modelo salvo de volta no Construtor (edição) ─────────────
  function handleEditTemplate(tpl) {
    const versionMatch = versions.find((v) => v.version === tpl.version_tiss);
    if (!versionMatch) {
      toast.error('A versão TISS deste modelo não está mais disponível.');
      return;
    }

    let parsed = null;
    try { parsed = JSON.parse(tpl.content); } catch { /* conteúdo inválido */ }
    const activePaths = Array.isArray(parsed?.active_optional_paths) ? parsed.active_optional_paths : [];

    uploadedTagsRef.current = null;
    setUploadedFileName(null);
    setTemplateName(tpl.name);
    setTemplateDescription(tpl.description ?? '');
    setActiveTab('builder');

    const versionIdStr   = String(versionMatch.id);
    const sameSelection   = String(selectedVersionId) === versionIdStr && selectedType === tpl.transacao_tipo;

    if (sameSelection && rootNode) {
      // Já estamos na mesma árvore (versão + serviço inalterados) — aplica direto.
      isRestoredSessionRef.current = true;
      seenOptionalsRef.current = new Set(activePaths);
      setNodeCache({});
      setCheckedOptionals(new Set(activePaths));
    } else {
      pendingRestoreRef.current = activePaths;
      setSelectedVersionId(versionIdStr);
      setSelectedType(tpl.transacao_tipo);
    }

    toast.success(`Modelo "${tpl.name}" carregado no Construtor.`);
  }

  // ── Gestão de modelos salvos ───────────────────────────────────────────
  async function handleToggleStatus(tpl) {
    try {
      await api.put(`/xml-templates/${tpl.id}`, { is_active: !tpl.is_active });
      setMyTemplates((prev) => prev.map((t) => t.id === tpl.id ? { ...t, is_active: !t.is_active } : t));
      toast.success(`Modelo "${tpl.name}" ${!tpl.is_active ? 'ativado' : 'desativado'}.`);
    } catch {
      toast.error('Erro ao atualizar o status do modelo.');
    }
  }

  async function handleDeleteTemplate(tpl) {
    try {
      await api.delete(`/xml-templates/${tpl.id}`);
      setMyTemplates((prev) => prev.filter((t) => t.id !== tpl.id));
      toast.success(`Modelo "${tpl.name}" excluído definitivamente.`);
    } catch {
      toast.error('Erro ao excluir o modelo.');
    }
  }

  const canGenerate = !!rootNode && !loadingEntry && !entryError;

  return (
    <DashboardLayout>
      <div className="flex flex-col overflow-hidden -m-6" style={{ height: 'calc(100vh - 64px)' }}>

        {/* ── Top bar: tabs + guia ────────────────────────────────────── */}
        <div className="shrink-0 flex items-center gap-2 px-5 py-3 border-b border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-950/70">
          <button
            type="button"
            onClick={() => setActiveTab('builder')}
            className={[
              'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-150',
              activeTab === 'builder'
                ? 'bg-blue-500/10 text-blue-600 dark:text-[#60a5fa] border border-blue-500/30'
                : 'text-slate-500 dark:text-slate-400 border border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/50',
            ].join(' ')}
          >
            <Layers size={13} />
            Construtor
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('my-models')}
            className={[
              'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-150',
              activeTab === 'my-models'
                ? 'bg-blue-500/10 text-blue-600 dark:text-[#60a5fa] border border-blue-500/30'
                : 'text-slate-500 dark:text-slate-400 border border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/50',
            ].join(' ')}
          >
            <FolderOpen size={13} />
            Meus Modelos
            {myTemplates.length > 0 && (
              <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                {myTemplates.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setIsGuideOpen(true)}
            className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold
                       bg-blue-50 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400
                       border border-blue-200 dark:border-blue-500/30
                       hover:bg-blue-100 dark:hover:bg-blue-600/20 transition-all duration-200"
          >
            <BookOpen size={11} />
            Como Usar
          </button>
        </div>

        {/* ── Conteúdo ──────────────────────────────────────────────────── */}
        {activeTab === 'my-models' ? (
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-950/40">
            <div className="max-w-5xl mx-auto">
              <MyModelsTab
                templates={myTemplates}
                loading={loadingMyTemplates}
                onToggleStatus={handleToggleStatus}
                onDelete={handleDeleteTemplate}
                onEdit={handleEditTemplate}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">

            {/* ── Left: Construção ──────────────────────────────────── */}
            <div className="w-72 shrink-0 border-r border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-950/70 flex flex-col overflow-y-auto">
              <div className="flex flex-col gap-5 p-4">

                {/* Upload XML */}
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
                    Carregar XML Base (opcional)
                  </label>
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('xml-template-upload-input')?.click()}
                    className={[
                      'flex flex-col items-center justify-center gap-1.5 px-3 py-5 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-150',
                      dragOver
                        ? 'border-blue-400 bg-blue-500/10'
                        : 'border-slate-700/60 bg-slate-800/30 hover:bg-slate-800/50',
                    ].join(' ')}
                  >
                    <UploadCloud size={18} className="text-slate-400" />
                    <span className="text-[10px] text-slate-400 text-center leading-relaxed">
                      Arraste um XML ou clique para enviar
                    </span>
                    <input
                      id="xml-template-upload-input"
                      type="file"
                      accept=".xml"
                      className="hidden"
                      onChange={(e) => handleFile(e.target.files?.[0])}
                    />
                  </div>
                  {uploadedFileName && (
                    <div className="mt-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <FileCode2 size={11} className="text-[#34d399] shrink-0" />
                      <span className="text-[10px] text-[#34d399] truncate flex-1">{uploadedFileName}</span>
                      <button type="button" onClick={clearUpload} className="text-slate-500 hover:text-slate-300 shrink-0">
                        <X size={11} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Nome do Modelo */}
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
                    Nome do Modelo
                  </label>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="Ex: Lote SP/SADT padrão"
                    className={INPUT_CLASS}
                  />
                </div>

                {/* Descrição */}
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
                    Descrição
                  </label>
                  <textarea
                    value={templateDescription}
                    onChange={(e) => setTemplateDescription(e.target.value)}
                    placeholder="Observações sobre este modelo..."
                    rows={3}
                    className={[INPUT_CLASS, 'resize-none'].join(' ')}
                  />
                </div>

                {/* Versão */}
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    Versão TISS
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

                {/* Serviço */}
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
                    Serviço
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
                </div>

              </div>

              <div className="mt-auto shrink-0 p-4 border-t border-slate-200 dark:border-slate-800/60">
                <button
                  type="button"
                  disabled={!canGenerate || saving}
                  onClick={handleSave}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold
                             bg-emerald-500/10 text-[#34d399] border border-emerald-500/30
                             hover:bg-emerald-500/20 transition-all duration-150
                             disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  Salvar na Biblioteca
                </button>
              </div>
            </div>

            {/* ── Center: árvore com checkboxes ──────────────────────── */}
            <div className="w-[380px] shrink-0 flex flex-col bg-slate-50 dark:bg-slate-950/40 border-r border-slate-200 dark:border-slate-800/60">
              <div className="shrink-0 flex items-center gap-2 px-4 py-2.5 border-b border-slate-200 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/30">
                <GitBranch size={11} className="text-slate-700 dark:text-slate-400 shrink-0" />
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate">
                  {rootNode
                    ? rootNode.name
                    : selectedVersionId && selectedType
                      ? 'Carregando estrutura...'
                      : 'Selecione versão e serviço'}
                </span>
                {checkedOptionals.size > 0 && (
                  <span className="ml-auto text-[10px] font-mono text-[#34d399]/80 shrink-0">
                    {checkedOptionals.size} ativa{checkedOptionals.size !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-2">
                {loadingEntry && (
                  <div className="flex flex-col items-center justify-center h-full gap-3">
                    <Loader2 size={26} className="text-slate-600 animate-spin" />
                    <span className="text-xs text-slate-600 dark:text-slate-400">Carregando estrutura...</span>
                  </div>
                )}

                {!loadingEntry && entryError && (
                  <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                      <AlertCircle size={20} className="text-amber-400" />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{entryError}</p>
                  </div>
                )}

                {!loadingEntry && !entryError && !rootNode && (
                  <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6">
                    <div className="w-14 h-14 rounded-2xl bg-slate-200 dark:bg-slate-800/40 border border-slate-300 dark:border-slate-800/60 flex items-center justify-center">
                      <GitBranch size={22} className="text-slate-400 dark:text-slate-500" />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      A árvore de tags aparecerá aqui assim que a versão e o serviço forem selecionados.
                    </p>
                  </div>
                )}

                {!loadingEntry && !entryError && rootNode && (
                  <TemplateTreeNode
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
            </div>

            {/* ── Right: preview do resultado final ──────────────────── */}
            <div className="flex-1 min-w-0 flex flex-col bg-slate-950">
              {loadingPreview && !preview && (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <Loader2 size={26} className="text-slate-600 animate-spin" />
                  <span className="text-xs text-slate-500">Gerando preview...</span>
                </div>
              )}

              {!preview && !loadingPreview && (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
                  <div className="w-14 h-14 rounded-2xl bg-slate-800/40 border border-slate-800/60 flex items-center justify-center">
                    <FileCode2 size={22} className="text-slate-500" />
                  </div>
                  <p className="text-sm font-medium text-slate-400">
                    O resultado final aparecerá aqui em tempo real
                  </p>
                </div>
              )}

              {preview && (
                <CodeViewer
                  code={preview.xml}
                  fileName={`${templateName || 'modelo'}.xml`}
                  language="xml"
                  onDownload={() => {
                    const blob = new Blob([preview.xml], { type: 'application/xml;charset=utf-8' });
                    const url  = URL.createObjectURL(blob);
                    const a    = document.createElement('a');
                    a.href = url;
                    a.download = `${(templateName || 'modelo').replace(/[^\w.-]+/g, '_')}.xml`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {isGuideOpen && (
        <GuideModal guide={TOOL_GUIDES['xml-template-builder']} onClose={() => setIsGuideOpen(false)} />
      )}
    </DashboardLayout>
  );
}
