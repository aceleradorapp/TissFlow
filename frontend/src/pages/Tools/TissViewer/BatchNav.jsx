import { FileText, Stethoscope, Building2, Activity } from 'lucide-react';

const TYPE_META = {
  'SP-SADT':    { icon: Activity,    color: 'text-purple-500 dark:text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  'CONSULTA':   { icon: Stethoscope, color: 'text-blue-500 dark:text-blue-400',     bg: 'bg-blue-500/10',   border: 'border-blue-500/20'   },
  'INTERNACAO': { icon: Building2,   color: 'text-amber-500 dark:text-amber-400',   bg: 'bg-amber-500/10',  border: 'border-amber-500/20'  },
};

function getTypeMeta(tipo) {
  return TYPE_META[tipo] ?? { icon: FileText, color: 'text-slate-500', bg: 'bg-slate-100 dark:bg-slate-800/40', border: 'border-slate-200 dark:border-slate-700/50' };
}

export default function BatchNav({ guias, selected, onSelect }) {
  if (!guias?.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 px-4 text-center py-10">
        <FileText size={22} className="text-slate-300 dark:text-slate-700" />
        <p className="text-xs text-slate-400 dark:text-slate-600">Nenhuma guia encontrada no lote.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-slate-200 dark:border-slate-800/60">
        <span className="text-[9px] font-mono font-bold text-slate-400 dark:text-slate-600 uppercase tracking-[0.15em]">
          Lote · {guias.length} guia{guias.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Guide list */}
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
        {guias.map((g, i) => {
          const meta   = getTypeMeta(g.tipo);
          const Icon   = meta.icon;
          const isSelected = selected?.id === g.id;

          return (
            <button
              key={g.id ?? i}
              type="button"
              onClick={() => onSelect(g)}
              className={[
                'w-full text-left rounded-xl px-3 py-2.5 transition-all duration-150',
                'border',
                isSelected
                  ? `${meta.bg} ${meta.border}`
                  : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/40',
              ].join(' ')}
            >
              <div className="flex items-start gap-2">
                <div className={`mt-0.5 p-1 rounded-md shrink-0 ${meta.bg} border ${meta.border}`}>
                  <Icon size={11} className={meta.color} />
                </div>
                <div className="min-w-0">
                  <p className={`text-[11px] font-bold truncate ${isSelected ? meta.color : 'text-slate-700 dark:text-slate-300'}`}>
                    {g.tipoLabel}
                  </p>
                  <p className="text-[10px] font-mono text-slate-500 dark:text-slate-500 truncate">
                    Nº {g.numeroGuia}
                  </p>
                  {g.beneficiario?.nome && (
                    <p className="text-[10px] text-slate-400 dark:text-slate-600 truncate mt-0.5">
                      {g.beneficiario.nome}
                    </p>
                  )}
                </div>
              </div>
              {g.valorTotal?.geral && (
                <p className={`text-[10px] font-bold mt-1.5 text-right ${isSelected ? meta.color : 'text-slate-500 dark:text-slate-500'}`}>
                  {g.valorTotal.geral}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
