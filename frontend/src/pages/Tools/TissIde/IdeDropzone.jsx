import { useCallback, useState } from 'react';
import { FileCode2, Upload, Zap, Shield, GitBranch } from 'lucide-react';

export default function IdeDropzone({ onFile }) {
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback((file) => {
    if (file) onFile(file);
  }, [onFile]);

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }

  function onInputChange(e) {
    handleFile(e.target.files[0]);
    e.target.value = '';
  }

  return (
    <div
      className={[
        'relative border-2 border-dashed rounded-3xl p-12 text-center',
        'transition-all duration-300 cursor-pointer',
        'bg-white dark:bg-slate-900/60',
        dragging
          ? 'border-blue-400 dark:border-blue-500 scale-[1.015] shadow-2xl shadow-blue-500/10'
          : 'border-slate-300 dark:border-slate-700/60 hover:border-blue-400 dark:hover:border-blue-600',
      ].join(' ')}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => document.getElementById('ide-file-input').click()}
    >
      <input
        id="ide-file-input"
        type="file"
        accept=".xml"
        className="hidden"
        onChange={onInputChange}
      />

      <div className={[
        'w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4',
        'transition-colors duration-300',
        dragging
          ? 'bg-blue-100 dark:bg-blue-500/20'
          : 'bg-slate-100 dark:bg-slate-800/60',
      ].join(' ')}>
        <FileCode2 size={28} className={dragging ? 'text-blue-500' : 'text-slate-400 dark:text-slate-500'} />
      </div>

      <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-1">
        {dragging ? 'Solte o arquivo aqui' : 'Arraste o XML TISS ou clique para selecionar'}
      </h3>
      <p className="text-sm text-slate-400 dark:text-slate-500 mb-6">
        Qualquer versão TISS — o schema é carregado automaticamente do XSD oficial da ANS
      </p>

      <div className="flex flex-wrap justify-center gap-3">
        {[
          { icon: Shield, text: 'Validação via XSD oficial' },
          { icon: Zap,    text: 'Análise semântica em tempo real' },
          { icon: GitBranch, text: 'Enums e regras por versão' },
        ].map(({ icon: Icon, text }) => (
          <span
            key={text}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                       bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400
                       border border-slate-200 dark:border-slate-700/60"
          >
            <Icon size={11} />
            {text}
          </span>
        ))}
      </div>

      <button
        type="button"
        className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold
                   text-white bg-blue-600 hover:bg-blue-500 transition-colors duration-150"
        onClick={(e) => { e.stopPropagation(); document.getElementById('ide-file-input').click(); }}
      >
        <Upload size={14} />
        Selecionar arquivo .xml
      </button>
    </div>
  );
}
