import { useState, useEffect, useRef } from 'react';
import { Save, X, Cloud, FileText, AlignLeft, Loader2 } from 'lucide-react';

export default function SaveDocumentModal({ open, onClose, onSave, defaultFilename, isSaving }) {
  const [filename,    setFilename]    = useState('');
  const [description, setDescription] = useState('');
  const inputRef = useRef(null);

  // Reset fields whenever modal opens
  useEffect(() => {
    if (open) {
      setFilename(defaultFilename ?? '');
      setDescription('');
      // Delay focus so the transition has started
      setTimeout(() => inputRef.current?.select(), 80);
    }
  }, [open, defaultFilename]);

  function handleSubmit(e) {
    e.preventDefault();
    if (!filename.trim()) return;
    onSave({ filename: filename.trim(), description: description.trim() || null });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={!isSaving ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md
                      bg-white dark:bg-slate-900
                      rounded-2xl shadow-2xl shadow-black/40
                      border border-slate-200 dark:border-slate-700/60
                      animate-in fade-in zoom-in-95 duration-150">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-4
                        border-b border-slate-100 dark:border-slate-800">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
            <Cloud size={16} className="text-blue-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              Salvar na Nuvem
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              O documento ficará disponível no seu histórico de arquivos.
            </p>
          </div>
          {!isSaving && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600
                         dark:hover:text-slate-200 hover:bg-slate-100
                         dark:hover:bg-slate-800 transition-all"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">

          {/* Filename */}
          <div>
            <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase
                               tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              <FileText size={10} />
              Título do documento
              <span className="text-red-400 ml-0.5">*</span>
            </label>
            <input
              ref={inputRef}
              type="text"
              value={filename}
              onChange={e => setFilename(e.target.value)}
              required
              disabled={isSaving}
              placeholder="Ex: Guia SP/SADT – Janeiro 2024"
              className="w-full px-3 py-2 rounded-xl text-sm
                         bg-slate-50 dark:bg-slate-800/60
                         border border-slate-300 dark:border-slate-700/60
                         text-slate-800 dark:text-slate-200
                         placeholder:text-slate-400 dark:placeholder:text-slate-600
                         disabled:opacity-50
                         focus:outline-none focus:ring-2 focus:ring-blue-500/30
                         focus:border-blue-400 dark:focus:border-blue-500
                         transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase
                               tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              <AlignLeft size={10} />
              Descrição das alterações
              <span className="ml-1 text-[10px] font-normal normal-case text-slate-400">(opcional)</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              disabled={isSaving}
              rows={3}
              placeholder="Descreva o que foi corrigido ou ajustado nesta versão…"
              className="w-full px-3 py-2 rounded-xl text-sm resize-none
                         bg-slate-50 dark:bg-slate-800/60
                         border border-slate-300 dark:border-slate-700/60
                         text-slate-800 dark:text-slate-200
                         placeholder:text-slate-400 dark:placeholder:text-slate-600
                         disabled:opacity-50
                         focus:outline-none focus:ring-2 focus:ring-blue-500/30
                         focus:border-blue-400 dark:focus:border-blue-500
                         transition-all"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl text-xs font-medium
                         text-slate-600 dark:text-slate-400
                         bg-slate-100 dark:bg-slate-800/60
                         border border-slate-300 dark:border-slate-700/60
                         hover:bg-slate-200 dark:hover:bg-slate-700/60
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving || !filename.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold
                         text-white bg-blue-600 hover:bg-blue-500
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all duration-150"
            >
              {isSaving
                ? <><Loader2 size={11} className="animate-spin" /> Salvando…</>
                : <><Save size={11} /> Salvar documento</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
