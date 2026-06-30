import { useState, useEffect } from 'react';
import {
  ChevronDown, Loader2, AlertCircle, BookOpen, Sparkles,
  Hash, Braces, Box, Terminal, FileCode2,
  X, Lock, Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '../../../components/DashboardLayout';
import GuideModal from '../../../components/Modals/GuideModal';
import { TOOL_GUIDES } from '../../../config/toolGuides';
import api from '../../../services/api';
import CodeViewer from './CodeViewer';

// ── Static data ──────────────────────────────────────────────────────────

const TRANSACTION_TYPES = [
  { value: 'ENVIO_LOTE_GUIAS',          label: 'Envio de Lote de Guias' },
  { value: 'ENVIO_RECURSO_GLOSA',       label: 'Recurso de Glosa' },
  { value: 'SOLICITACAO_ELEGIBILIDADE', label: 'Solicitação de Elegibilidade' },
  { value: 'RESPOSTA_ELEGIBILIDADE',    label: 'Resposta de Elegibilidade' },
  { value: 'AUTORIZACAO_SOLICITACAO',   label: 'Autorização de Solicitação' },
];

const LANGUAGES = [
  { value: 'csharp',     label: '.NET (C#)',  icon: Hash },
  { value: 'typescript', label: 'TypeScript', icon: Braces },
  { value: 'go',         label: 'Go',         icon: Box },
  { value: 'python',     label: 'Python',     icon: Terminal },
  { value: 'xml',        label: 'XML Modelo', icon: FileCode2 },
];

const SELECT_CLASS = [
  'w-full appearance-none text-xs rounded-xl px-3 py-2.5 pr-8',
  'bg-slate-800/80 border border-slate-700/60 text-slate-200',
  'focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/40',
  'transition-all duration-200 disabled:opacity-40 cursor-pointer',
].join(' ');

// ── Upgrade modal (Free Trial download lock) ────────────────────────────
// Duplicated per-file, matching the established convention in VersionComparator.

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
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Zap size={15} className="text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Recurso Premium</p>
              <p className="text-[11px] text-slate-400">Disponível nos planos pagos</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="px-5 py-5">
          <div className="flex items-start gap-3 p-3.5 rounded-xl
                          bg-amber-50 dark:bg-amber-500/10
                          border border-amber-200 dark:border-amber-500/30 mb-5">
            <Lock size={14} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
              O download do arquivo completo está disponível a partir do plano <strong>Bronze</strong>.
              Faça upgrade para desbloquear esta e outras funcionalidades avançadas.
            </p>
          </div>

          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Escolha seu plano
          </p>

          <div className="flex flex-col gap-2.5">
            {UPGRADE_PLANS.map((plan) => (
              <div key={plan.name} className={`flex items-center justify-between px-4 py-3 rounded-xl border ${plan.bg} ${plan.border}`}>
                <div className="flex items-center gap-2">
                  <Zap size={13} className={plan.color} />
                  <span className={`text-sm font-bold ${plan.color}`}>{plan.name}</span>
                </div>
                <span className={`text-xs font-semibold ${plan.color}`}>{plan.price}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="px-5 pb-5">
          <p className="text-center text-xs text-slate-400 mb-3">
            Entre em contato com o administrador para fazer upgrade do seu plano.
          </p>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────

export default function ClassGenerator() {
  const [versions,          setVersions]          = useState([]);
  const [selectedVersionId, setSelectedVersionId] = useState(null);
  const [selectedType,      setSelectedType]      = useState('');
  const [selectedLanguage,  setSelectedLanguage]  = useState('csharp');

  const [loadingVersions, setLoadingVersions] = useState(true);
  const [loadingCode,     setLoadingCode]     = useState(false);
  const [genError,        setGenError]        = useState(null);
  const [result,          setResult]          = useState(null);

  const [isGuideOpen,       setIsGuideOpen]       = useState(false);
  const [userProfile,       setUserProfile]       = useState(null);
  const [showUpgradeModal,  setShowUpgradeModal]  = useState(false);

  const canDownload = userProfile?.plan?.name !== 'Free Trial';

  // ── Load versions ────────────────────────────────────────────────────
  useEffect(() => {
    api.get('/tools/swagger/versions')
      .then(({ data }) => setVersions(data.versions))
      .catch((err) => toast.error(err.response?.data?.error ?? 'Erro ao carregar versões TISS.'))
      .finally(() => setLoadingVersions(false));
  }, []);

  // ── Load user profile for plan check ────────────────────────────────
  useEffect(() => {
    api.get('/auth/profile')
      .then(({ data }) => setUserProfile(data.user))
      .catch(() => {});
  }, []);

  // ── Generate code whenever version + type + language are all set ────
  useEffect(() => {
    setResult(null);
    setGenError(null);

    if (!selectedVersionId || !selectedType || !selectedLanguage) return;

    setLoadingCode(true);
    api.post('/tools/class-generator/generate', {
      version_id:       Number(selectedVersionId),
      transaction_type: selectedType,
      language:         selectedLanguage,
    })
      .then(({ data }) => setResult(data))
      .catch((err) => setGenError(err?.response?.data?.error ?? 'Erro ao gerar código.'))
      .finally(() => setLoadingCode(false));
  }, [selectedVersionId, selectedType, selectedLanguage]);

  function handleDownload() {
    if (!result?.code) return;
    if (!canDownload) { setShowUpgradeModal(true); return; }

    const blob = new Blob([result.code], { type: 'text/plain;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = result.fileName || 'output.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <DashboardLayout>
      <div className="flex overflow-hidden -m-6" style={{ height: 'calc(100vh - 64px)' }}>

        {/* ── Left: Painel de Controle ──────────────────────────── */}
        <div className="w-60 shrink-0 border-r border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-950/70 flex flex-col">

          <div className="shrink-0 px-4 py-3 border-b border-slate-200 dark:border-slate-800/60 flex items-center justify-between">
            <span className="text-[9px] font-mono font-bold text-slate-500 dark:text-slate-600 uppercase tracking-[0.15em]">
              Gerador de Classes
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
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
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
                2. Transação Raiz
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

            {/* Language tabs */}
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
                3. Linguagem Alvo
              </label>
              <div className="flex flex-col gap-1.5">
                {LANGUAGES.map((lang) => {
                  const Icon   = lang.icon;
                  const active = selectedLanguage === lang.value;
                  return (
                    <button
                      key={lang.value}
                      type="button"
                      onClick={() => setSelectedLanguage(lang.value)}
                      className={[
                        'flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all duration-150',
                        active
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/40'
                          : 'bg-slate-800/40 text-slate-400 border-slate-700/50 hover:bg-slate-800/70 hover:text-slate-200',
                      ].join(' ')}
                    >
                      <Icon size={13} className={active ? 'text-blue-400' : 'text-slate-500'} />
                      {lang.label}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Base of sidebar: future feature button */}
          <div className="shrink-0 p-4 border-t border-slate-200 dark:border-slate-800/60">
            <button
              type="button"
              disabled
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[11px] font-semibold
                         text-cyan-300/80 bg-cyan-500/5 border border-cyan-400/30
                         shadow-[0_0_14px_rgba(34,211,238,0.25)]
                         cursor-not-allowed opacity-90"
            >
              <Sparkles size={12} />
              Carregar Lista Particular (Em breve)
            </button>
          </div>
        </div>

        {/* ── Right: Visualizador de Código ─────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col bg-slate-950">
          {loadingCode && (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <Loader2 size={26} className="text-slate-600 animate-spin" />
              <span className="text-xs text-slate-500">Compilando estrutura XSD...</span>
            </div>
          )}

          {!loadingCode && genError && (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <AlertCircle size={20} className="text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-400">Não foi possível gerar o código</p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-80">{genError}</p>
              </div>
            </div>
          )}

          {!loadingCode && !genError && !result && (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
              <div className="w-14 h-14 rounded-2xl bg-slate-800/40 border border-slate-800/60 flex items-center justify-center">
                <FileCode2 size={22} className="text-slate-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-400">
                  {!selectedVersionId
                    ? 'Selecione uma versão TISS'
                    : !selectedType
                      ? 'Selecione a transação raiz'
                      : 'Selecione a linguagem alvo'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  O código será compilado automaticamente a partir do XSD da ANS.
                </p>
              </div>
            </div>
          )}

          {!loadingCode && !genError && result && (
            <CodeViewer
              code={result.code}
              fileName={result.fileName}
              language={result.language}
              onDownload={handleDownload}
            />
          )}
        </div>
      </div>

      {isGuideOpen && (
        <GuideModal guide={TOOL_GUIDES['class-generator']} onClose={() => setIsGuideOpen(false)} />
      )}

      {showUpgradeModal && (
        <UpgradeModal onClose={() => setShowUpgradeModal(false)} />
      )}
    </DashboardLayout>
  );
}
