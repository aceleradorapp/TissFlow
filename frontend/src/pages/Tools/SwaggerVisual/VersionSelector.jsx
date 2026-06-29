import { ChevronDown, Loader2, BookOpen } from 'lucide-react';

const SELECT_CLASS = [
  'w-full appearance-none text-xs rounded-xl px-3 py-2.5 pr-8',
  'bg-slate-100 dark:bg-slate-800/80',
  'border border-slate-300 dark:border-slate-700/60',
  'text-slate-800 dark:text-slate-200',
  'focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/40',
  'transition-all duration-200',
  'disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer',
].join(' ');

export default function VersionSelector({ versions, versionId, onVersionChange, loadingVersions, onGuideOpen }) {
  return (
    <div className="flex flex-col h-full overflow-y-auto">

      {/* Panel header */}
      <div className="shrink-0 px-4 py-3 border-b border-slate-200 dark:border-slate-800/60 flex items-center justify-between">
        <span className="text-[9px] font-mono font-bold text-slate-500 dark:text-slate-600 uppercase tracking-[0.15em]">
          Explorador TISS
        </span>
        {onGuideOpen && (
          <button
            onClick={onGuideOpen}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-semibold
                       bg-blue-50 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400
                       border border-blue-200 dark:border-blue-500/30
                       hover:bg-blue-100 dark:hover:bg-blue-600/20 transition-all duration-200"
          >
            <BookOpen size={11} />
            Como Usar
          </button>
        )}
      </div>

      <div className="flex flex-col gap-5 p-4 flex-1">

        {/* Version selector */}
        <div>
          <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5 block">
            Versão TISS
            {loadingVersions && <Loader2 size={9} className="animate-spin text-slate-400 dark:text-slate-400" />}
          </label>
          <div className="relative">
            <select
              value={versionId ?? ''}
              onChange={(e) => onVersionChange(e.target.value || null)}
              disabled={loadingVersions}
              className={SELECT_CLASS}
            >
              <option value="">Selecionar...</option>
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  TISS {v.version}
                </option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-2">
          <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Legenda</span>
          <div className="flex flex-col gap-1.5">
            <span className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
              Campo obrigatório
            </span>
            <span className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-600 shrink-0" />
              Campo opcional
            </span>
            <span className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 shrink-0" />
              Resultado da busca
            </span>
          </div>
        </div>

        {/* Usage hint */}
        <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed">
          Selecione uma versão para navegar pela estrutura hierárquica do TISS a partir do nó raiz
          <span className="font-mono text-slate-500 dark:text-slate-400"> mensagemTISS</span>.
        </p>

      </div>
    </div>
  );
}
