import { useState, useRef } from 'react';
import { UploadCloud, FileCode2 } from 'lucide-react';

export default function Dropzone({ onFile }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  }

  function handleChange(e) {
    const file = e.target.files?.[0];
    if (file) onFile(file);
    e.target.value = '';
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={[
        'relative flex flex-col items-center justify-center gap-5 rounded-2xl cursor-pointer',
        'border-2 border-dashed transition-all duration-200 select-none',
        'min-h-[340px] px-10 py-12',
        dragging
          ? 'border-blue-500 bg-blue-500/5 scale-[1.01]'
          : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/40',
        'hover:border-blue-400 dark:hover:border-blue-500/60 hover:bg-blue-500/[0.03]',
      ].join(' ')}
    >
      {/* Background glow when dragging */}
      {dragging && (
        <div className="absolute inset-0 rounded-2xl bg-blue-500/5 pointer-events-none" />
      )}

      {/* Icon */}
      <div className={[
        'w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-200',
        dragging
          ? 'bg-blue-500/20 border border-blue-500/40'
          : 'bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60',
      ].join(' ')}>
        {dragging
          ? <FileCode2 size={28} className="text-blue-500" />
          : <UploadCloud size={28} className="text-slate-400 dark:text-slate-500" />
        }
      </div>

      {/* Text */}
      <div className="text-center">
        <p className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-1">
          {dragging ? 'Solte o arquivo aqui' : 'Arraste seu XML TISS'}
        </p>
        <p className="text-sm text-slate-400 dark:text-slate-500">
          ou <span className="text-blue-600 dark:text-blue-400 font-medium underline underline-offset-2">clique para selecionar</span>
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
          Suporta padrões TISS 2.x · 3.x · 4.x · Tamanho máx: 10 MB
        </p>
      </div>

      {/* Features list */}
      <div className="flex flex-wrap justify-center gap-2">
        {[
          'Detecção automática de versão',
          'Guias SP/SADT, Consulta e Internação',
          'Validação estrutural',
          'Visualização humanizada',
        ].map((f) => (
          <span
            key={f}
            className="text-[10px] font-medium px-2.5 py-1 rounded-full
                       bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-500
                       border border-slate-200 dark:border-slate-700/50"
          >
            {f}
          </span>
        ))}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".xml"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}
