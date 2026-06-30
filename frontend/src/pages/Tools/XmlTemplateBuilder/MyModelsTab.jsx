import { useState } from 'react';
import { Download, Power, Trash2, Loader2, FolderOpen, Calendar, Pencil } from 'lucide-react';

const STATUS_BADGE = {
  true:  'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  false: 'bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-600/40',
};

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function MyModelsTab({ templates, loading, onToggleStatus, onDelete, onEdit }) {
  const [busyId, setBusyId] = useState(null);

  function parseContent(raw) {
    try { return JSON.parse(raw); } catch { return null; }
  }

  function handleDownload(tpl) {
    const content = parseContent(tpl.content);
    const xml = content?.xml ?? '';
    if (!xml) return;
    const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `${tpl.name.replace(/[^\w.-]+/g, '_')}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function handleToggle(tpl) {
    setBusyId(tpl.id);
    try { await onToggleStatus(tpl); } finally { setBusyId(null); }
  }

  async function handleDelete(tpl) {
    if (!window.confirm(`Excluir definitivamente o modelo "${tpl.name}"? Esta ação não pode ser desfeita.`)) return;
    setBusyId(tpl.id);
    try { await onDelete(tpl); } finally { setBusyId(null); }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 size={24} className="text-slate-400 animate-spin" />
        <span className="text-xs text-slate-500 dark:text-slate-400">Carregando seus modelos...</span>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center px-8">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800/60 flex items-center justify-center">
          <FolderOpen size={22} className="text-slate-400 dark:text-slate-500" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Nenhum modelo salvo ainda</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Construa um modelo na aba "Construtor" e salve para vê-lo aqui.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800/60 overflow-hidden
                    bg-white dark:bg-slate-900/60 shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800/60">
            <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Nome</th>
            <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Serviço</th>
            <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Versão</th>
            <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
            <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Atualizado</th>
            <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {templates.map((tpl) => (
            <tr key={tpl.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
              <td className="px-4 py-3">
                <p className="font-semibold text-slate-800 dark:text-slate-100">{tpl.name}</p>
                {tpl.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-xs truncate">{tpl.description}</p>
                )}
              </td>
              <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300 font-mono">
                {tpl.transacao_tipo || '—'}
              </td>
              <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300 font-mono">
                {tpl.version_tiss || '—'}
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_BADGE[tpl.is_active]}`}>
                  {tpl.is_active ? 'Ativo' : 'Inativo'}
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Calendar size={11} />
                  {fmtDate(tpl.updated_at)}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    title="Editar no Construtor"
                    onClick={() => onEdit(tpl)}
                    className="p-1.5 rounded-lg text-emerald-600 dark:text-[#34d399] bg-emerald-50 dark:bg-emerald-500/10
                               border border-emerald-200 dark:border-emerald-500/30
                               hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all duration-150"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    title="Baixar XML"
                    onClick={() => handleDownload(tpl)}
                    className="p-1.5 rounded-lg text-blue-600 dark:text-[#60a5fa] bg-blue-50 dark:bg-blue-500/10
                               border border-blue-200 dark:border-blue-500/30
                               hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-all duration-150"
                  >
                    <Download size={13} />
                  </button>
                  <button
                    type="button"
                    title={tpl.is_active ? 'Desativar' : 'Ativar'}
                    disabled={busyId === tpl.id}
                    onClick={() => handleToggle(tpl)}
                    className="p-1.5 rounded-lg text-amber-700 dark:text-[#fbbf24] bg-amber-50 dark:bg-amber-500/10
                               border border-amber-200 dark:border-amber-500/30
                               hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-all duration-150
                               disabled:opacity-40"
                  >
                    {busyId === tpl.id ? <Loader2 size={13} className="animate-spin" /> : <Power size={13} />}
                  </button>
                  <button
                    type="button"
                    title="Excluir definitivamente"
                    disabled={busyId === tpl.id}
                    onClick={() => handleDelete(tpl)}
                    className="p-1.5 rounded-lg text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10
                               border border-red-200 dark:border-red-500/30
                               hover:bg-red-100 dark:hover:bg-red-500/20 transition-all duration-150
                               disabled:opacity-40"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
