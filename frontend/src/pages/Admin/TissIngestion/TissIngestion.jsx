import { useState, useRef, useCallback } from 'react';
import { UploadCloud, X, FileCode2, CheckCircle2, Loader2, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '../../../components/DashboardLayout';
import api from '../../../services/api';

// ─── File list item ───────────────────────────────────────────────────────────

function FileChip({ file, onRemove }) {
  const kb = (file.size / 1024).toFixed(1);
  return (
    <div className="flex items-center justify-between gap-3
                    bg-slate-800/60 border border-slate-700/60 rounded-xl
                    px-3.5 py-2.5 text-sm">
      <div className="flex items-center gap-2.5 min-w-0">
        <FileCode2 size={15} className="shrink-0 text-blue-400" />
        <span className="text-slate-200 truncate font-mono text-xs">{file.name}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-slate-600">{kb} KB</span>
        <button
          type="button"
          onClick={onRemove}
          className="p-0.5 rounded-md text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TissIngestion() {
  const [version,     setVersion]     = useState('');
  const [releaseDate, setReleaseDate] = useState('');
  const [files,       setFiles]       = useState([]);
  const [isDragging,  setIsDragging]  = useState(false);
  const [loading,     setLoading]     = useState(false);

  const inputRef = useRef(null);

  // ── File helpers ──────────────────────────────────────────────────────────

  function addFiles(incoming) {
    const xsds = Array.from(incoming).filter((f) =>
      /\.(xsd|xml)$/i.test(f.name)
    );
    if (!xsds.length) {
      toast.error('Apenas arquivos .xsd ou .xml são aceitos.');
      return;
    }
    setFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.name));
      return [...prev, ...xsds.filter((f) => !existingNames.has(f.name))];
    });
  }

  function removeFile(name) {
    setFiles((prev) => prev.filter((f) => f.name !== name));
  }

  // ── Drag & drop handlers ──────────────────────────────────────────────────

  const onDragOver = useCallback((e) => { e.preventDefault(); setIsDragging(true);  }, []);
  const onDragLeave= useCallback((e) => { e.preventDefault(); setIsDragging(false); }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  }, []);

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit(e) {
    e.preventDefault();

    if (!version.trim()) {
      toast.error('Informe a versão TISS (ex: 4.01).');
      return;
    }
    if (files.length === 0) {
      toast.error('Selecione ao menos um arquivo XSD.');
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append('version', version.trim());
    if (releaseDate) formData.append('release_date', releaseDate);
    files.forEach((f) => formData.append('xsd_files', f));

    try {
      const { data } = await api.post('/admin/tiss/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success(
        `TISS ${data.message.match(/'([^']+)'/)?.[1] ?? version} armazenada com sucesso! ` +
        `${data.filesStored} arquivo${data.filesStored !== 1 ? 's' : ''} XSD salvos em disco.`,
        { duration: 7000 }
      );

      setFiles([]);
      setVersion('');
      setReleaseDate('');
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Erro ao salvar os arquivos XSD.');
    } finally {
      setLoading(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const fieldClass = [
    'w-full px-4 py-2.5 text-sm rounded-xl',
    'bg-slate-800/60 border border-slate-700/60',
    'text-slate-200 placeholder:text-slate-600',
    'focus:outline-none focus:ring-1 focus:ring-blue-500/60 focus:border-blue-500/40',
    'transition-all duration-200',
  ].join(' ');

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <span className="inline-flex items-center text-xs font-mono font-bold px-2 py-0.5 rounded-md
                           bg-purple-500/10 text-purple-400 border border-purple-500/30 mb-3">
            ADMIN · MÓDULOS XSD
          </span>
          <h1 className="text-2xl font-bold text-slate-50">Ingestão de Esquemas TISS</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Faça o upload dos arquivos XSD da ANS para armazenamento físico em disco e ativação da versão.
          </p>
        </div>

        {/* Form card */}
        <form
          onSubmit={handleSubmit}
          className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/60 rounded-2xl p-8
                     relative overflow-hidden"
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-purple-500/[0.03] to-transparent rounded-2xl" />

          <div className="relative z-10 flex flex-col gap-6">

            {/* Version + Date row */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Versão TISS
                </label>
                <input
                  type="text"
                  placeholder="ex: 4.01"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  disabled={loading}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Data de Vigência
                </label>
                <input
                  type="date"
                  value={releaseDate}
                  onChange={(e) => setReleaseDate(e.target.value)}
                  disabled={loading}
                  className={[fieldClass, 'date-input-dark'].join(' ')}
                />
              </div>
            </div>

            {/* Dropzone */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                Arquivos XSD
              </label>

              <div
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => !loading && inputRef.current?.click()}
                className={[
                  'relative border-2 border-dashed rounded-2xl transition-all duration-200 cursor-pointer',
                  'flex flex-col items-center justify-center gap-3 py-10 px-6',
                  isDragging
                    ? 'border-blue-500/70 bg-blue-500/5'
                    : 'border-slate-700/60 hover:border-slate-600/80 hover:bg-white/[0.02]',
                  loading ? 'pointer-events-none opacity-60' : '',
                ].join(' ')}
              >
                <div className={[
                  'w-12 h-12 rounded-xl flex items-center justify-center transition-colors duration-200',
                  isDragging ? 'bg-blue-500/20' : 'bg-slate-800/80',
                ].join(' ')}>
                  <UploadCloud size={22} className={isDragging ? 'text-blue-400' : 'text-slate-500'} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-300">
                    {isDragging ? 'Solte os arquivos aqui' : 'Arraste arquivos XSD ou clique para selecionar'}
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">Aceita .xsd e .xml · múltiplos arquivos</p>
                </div>
                <button
                  type="button"
                  className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg
                             bg-slate-800 border border-slate-700/60 text-slate-400
                             hover:text-slate-200 hover:border-slate-600 transition-all duration-200"
                >
                  <FolderOpen size={13} />
                  Selecionar arquivos
                </button>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".xsd,.xml"
                  multiple
                  className="hidden"
                  onChange={(e) => addFiles(e.target.files)}
                />
              </div>
            </div>

            {/* File list */}
            {files.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {files.length} arquivo{files.length !== 1 ? 's' : ''} selecionado{files.length !== 1 ? 's' : ''}
                  </span>
                  <button
                    type="button"
                    onClick={() => setFiles([])}
                    className="text-xs text-slate-600 hover:text-red-400 transition-colors"
                  >
                    Limpar tudo
                  </button>
                </div>
                {files.map((f) => (
                  <FileChip key={f.name} file={f} onRemove={() => removeFile(f.name)} />
                ))}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !version.trim() || files.length === 0}
              className={[
                'w-full flex items-center justify-center gap-3 py-3.5 rounded-xl font-semibold text-sm',
                'transition-all duration-300',
                loading || !version.trim() || files.length === 0
                  ? 'bg-slate-800/60 text-slate-600 cursor-not-allowed border border-slate-700/40'
                  : 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-900/30 hover:shadow-blue-900/50 hover:brightness-110',
              ].join(' ')}
            >
              {loading ? (
                <>
                  <Loader2 size={17} className="animate-spin shrink-0" />
                  <span>Salvando esquemas em disco...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={17} className="shrink-0" />
                  <span>Processar Versão</span>
                </>
              )}
            </button>

          </div>
        </form>

        {/* Info card */}
        <div className="mt-4 bg-slate-900/40 border border-slate-800/40 rounded-xl px-5 py-4
                        flex items-start gap-3 text-xs text-slate-500">
          <FileCode2 size={14} className="shrink-0 mt-0.5 text-slate-600" />
          <p>
            Os arquivos XSD são salvos fisicamente em{' '}
            <span className="text-slate-400 font-mono">src/storage/schemas/v&lt;versão&gt;/</span>{' '}
            com os nomes originais intactos — garantindo compatibilidade com os{' '}
            <span className="text-slate-400 font-medium">&lt;include&gt;</span> e{' '}
            <span className="text-slate-400 font-medium">&lt;import&gt;</span> do XSD.
            Re-uploads sobrescrevem a pasta anterior de forma limpa.
          </p>
        </div>

      </div>
    </DashboardLayout>
  );
}
