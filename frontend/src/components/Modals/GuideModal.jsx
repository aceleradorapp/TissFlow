import { X, BookOpen, Lightbulb } from 'lucide-react';

export default function GuideModal({ guide, onClose }) {
  if (!guide) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className={[
          'relative w-full max-w-lg rounded-2xl shadow-2xl',
          'bg-white dark:bg-slate-900',
          'border border-slate-200 dark:border-slate-700/60',
          'flex flex-col overflow-hidden',
          'animate-fade-slide-in',
        ].join(' ')}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-3 p-5 border-b border-slate-100 dark:border-slate-800/60">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
            <BookOpen size={16} className="text-blue-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600 mb-0.5">
              Como Usar
            </p>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-50 leading-tight">
              {guide.title}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              {guide.description}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200
                       hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200 shrink-0"
          >
            <X size={15} />
          </button>
        </div>

        {/* Steps */}
        <div className="p-5 flex flex-col gap-3.5">
          {guide.steps.map((step, i) => (
            <div key={i} className="flex gap-3">
              <span className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center
                               text-[11px] font-extrabold tabular-nums bg-blue-500 text-white">
                {i + 1}
              </span>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed pt-0.5">
                {step}
              </p>
            </div>
          ))}
        </div>

        {/* Pro Tip */}
        {guide.proTip && (
          <div className="mx-5 mb-5 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-500/10
                          border border-amber-200 dark:border-amber-500/20 flex gap-2.5">
            <Lightbulb size={14} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              <span className="font-semibold">Dica Pro:</span> {guide.proTip}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
