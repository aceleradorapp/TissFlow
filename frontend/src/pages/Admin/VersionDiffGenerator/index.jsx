import { useState, useEffect } from 'react';
import {
  GitCompare, Loader2, Play, CheckCircle2,
  Plus, Minus, RefreshCw, AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '../../../components/DashboardLayout';
import api from '../../../services/api';

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color, bg }) {
  return (
    <div className={`rounded-xl p-4 ${bg} flex flex-col items-center text-center gap-1.5`}>
      <Icon size={16} className={color} />
      <span className={`text-3xl font-extrabold tabular-nums ${color}`}>{value}</span>
      <span className="text-[11px] text-slate-500 leading-tight">{label}</span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const SELECT_CLS = [
  'w-full px-3 py-2.5 rounded-xl text-sm appearance-none cursor-pointer',
  'bg-white dark:bg-slate-800/60',
  'border border-slate-200 dark:border-slate-700/60',
  'text-slate-800 dark:text-slate-200',
  'focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400',
  'disabled:opacity-50 disabled:cursor-not-allowed',
  'transition-all',
].join(' ');

export default function VersionDiffGenerator() {
  const [versions,      setVersions]      = useState([]);
  const [sourceVersion, setSourceVersion] = useState('');
  const [targetVersion, setTargetVersion] = useState('');
  const [loading,       setLoading]       = useState(true);
  const [processing,    setProcessing]    = useState(false);
  const [result,        setResult]        = useState(null);

  useEffect(() => {
    api.get('/admin/versions')
      .then(({ data }) => setVersions(data.versions))
      .catch(() => toast.error('Erro ao carregar versões TISS.'))
      .finally(() => setLoading(false));
  }, []);

  async function handleGenerate() {
    if (!sourceVersion || !targetVersion) {
      toast.error('Selecione as duas versões antes de processar.');
      return;
    }
    if (sourceVersion === targetVersion) {
      toast.error('As versões de origem e destino devem ser diferentes.');
      return;
    }

    setProcessing(true);
    setResult(null);
    try {
      const { data } = await api.post('/admin/versions/generate-diff', {
        sourceVersion,
        targetVersion,
      });
      setResult({ ...data, src: sourceVersion, tgt: targetVersion });
      toast.success(`${data.total} mudança(s) sincronizadas com sucesso.`);
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Erro ao processar diff.');
    } finally {
      setProcessing(false);
    }
  }

  const canSubmit = sourceVersion && targetVersion && sourceVersion !== targetVersion && !processing;
  const sameVersion = sourceVersion && targetVersion && sourceVersion === targetVersion;

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <span className="inline-flex items-center text-xs font-mono font-bold px-2 py-0.5 rounded-md
                           bg-purple-500/10 text-purple-600 dark:text-purple-400
                           border border-purple-500/30 mb-3">
            ADMIN · EXCLUSIVO PROPRIETÁRIO
          </span>
          <div className="flex items-center gap-3">
            <GitCompare size={22} className="text-purple-500 shrink-0" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
              Gerador de Diff TISS
            </h1>
          </div>
          <p className="text-slate-500 text-sm mt-1.5 leading-relaxed">
            Selecione duas versões TISS para detectar e persistir automaticamente todos os
            campos adicionados, removidos ou modificados entre elas. Use esta ferramenta ao
            publicar novas versões do padrão ANS.
          </p>
        </div>

        {/* Control card */}
        <div className="bg-white dark:bg-slate-900/60
                        border border-slate-200 dark:border-slate-800/60
                        rounded-2xl p-6 mb-6">

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="text-slate-400 animate-spin" />
            </div>
          ) : versions.length < 2 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <AlertCircle size={24} className="text-amber-500" />
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Você precisa de pelo menos 2 versões TISS cadastradas.
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Faça upload dos arquivos XSD em{' '}
                  <strong className="text-slate-600 dark:text-slate-400">Admin → Módulos XSD</strong>.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">

                {/* Source */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider
                                    text-slate-500 dark:text-slate-400 mb-2">
                    Versão Base (Origem)
                  </label>
                  <select
                    value={sourceVersion}
                    onChange={(e) => { setSourceVersion(e.target.value); setResult(null); }}
                    disabled={processing}
                    className={SELECT_CLS}
                  >
                    <option value="">Selecionar versão…</option>
                    {versions.map((v) => (
                      <option key={v.id} value={v.version}>{v.version}</option>
                    ))}
                  </select>
                </div>

                {/* Target */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider
                                    text-slate-500 dark:text-slate-400 mb-2">
                    Versão Alvo (Destino)
                  </label>
                  <select
                    value={targetVersion}
                    onChange={(e) => { setTargetVersion(e.target.value); setResult(null); }}
                    disabled={processing}
                    className={SELECT_CLS}
                  >
                    <option value="">Selecionar versão…</option>
                    {versions.map((v) => (
                      <option key={v.id} value={v.version}>{v.version}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Same-version warning */}
              {sameVersion && (
                <p className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 mb-4">
                  <AlertCircle size={12} />
                  Selecione versões diferentes para gerar o diff.
                </p>
              )}

              {/* Arrow visual */}
              {sourceVersion && targetVersion && !sameVersion && (
                <p className="text-xs text-slate-400 mb-4 font-mono">
                  <span className="text-slate-600 dark:text-slate-300 font-semibold">{sourceVersion}</span>
                  {' → '}
                  <span className="text-slate-600 dark:text-slate-300 font-semibold">{targetVersion}</span>
                </p>
              )}

              {/* Action */}
              <button
                onClick={handleGenerate}
                disabled={!canSubmit}
                className="flex items-center gap-2.5 px-6 py-3 rounded-xl font-semibold text-sm
                           text-white bg-purple-600 hover:bg-purple-500
                           disabled:opacity-50 disabled:cursor-not-allowed
                           transition-all duration-150"
              >
                {processing
                  ? <><Loader2 size={15} className="animate-spin" /> Processando schema XSD…</>
                  : <><Play size={15} /> Processar e Sincronizar Diferenças</>
                }
              </button>

              {processing && (
                <p className="text-xs text-slate-400 mt-3">
                  Isso pode levar alguns segundos enquanto os schemas XSD são lidos e cruzados…
                </p>
              )}
            </>
          )}
        </div>

        {/* Result card */}
        {result && (
          <div className="bg-white dark:bg-slate-900/60
                          border border-slate-200 dark:border-slate-800/60
                          rounded-2xl p-6
                          animate-in fade-in slide-in-from-bottom-2 duration-300">

            <div className="flex items-center gap-2.5 mb-5">
              <CheckCircle2 size={17} className="text-emerald-500 shrink-0" />
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Sincronização concluída
              </h2>
              <span className="ml-1 font-mono text-xs text-slate-400">
                {result.src} → {result.tgt}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-5">
              <StatCard
                icon={Plus}
                label="Adicionados"
                value={result.adds}
                color="text-emerald-600 dark:text-emerald-400"
                bg="bg-emerald-500/10"
              />
              <StatCard
                icon={Minus}
                label="Removidos"
                value={result.removed}
                color="text-red-600 dark:text-red-400"
                bg="bg-red-500/10"
              />
              <StatCard
                icon={RefreshCw}
                label="Modificados"
                value={result.modified}
                color="text-amber-600 dark:text-amber-400"
                bg="bg-amber-500/10"
              />
            </div>

            <p className="text-xs text-slate-500 text-center">
              <strong className="text-slate-600 dark:text-slate-400">{result.total}</strong> mudança
              {result.total !== 1 ? 's' : ''} persistida{result.total !== 1 ? 's' : ''} na tabela{' '}
              <code className="font-mono text-[11px] text-purple-500 dark:text-purple-400">
                tiss_version_changes
              </code>
              . Você pode re-processar a qualquer momento para atualizar.
            </p>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
