import { useRef, useState } from 'react';
import { GitBranch, Loader2, MousePointerClick, Search, X } from 'lucide-react';
import TreeNode from './TreeNode';

export default function TreePanel({
  rootNode, loading,
  nodeCache, onExpand,
  selectedId, highlightedId, onSelect,
  onSearch, isSearching, searchResults,
}) {
  const [query, setQuery]       = useState('');
  const debounceRef             = useRef(null);

  function handleInput(e) {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onSearch(val), 400);
  }

  function handleClear() {
    setQuery('');
    clearTimeout(debounceRef.current);
    onSearch('');
  }

  const resultCount = searchResults?.length ?? null;

  // ── Empty / loading states ──────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <Loader2 size={26} className="text-slate-400 dark:text-slate-400 animate-spin" />
        <span className="text-xs text-slate-500 dark:text-slate-400">Carregando estrutura...</span>
      </div>
    );
  }

  if (!rootNode) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
        <div className="w-14 h-14 rounded-2xl bg-slate-200 dark:bg-slate-800/50 flex items-center justify-center">
          <GitBranch size={22} className="text-slate-400 dark:text-slate-500" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Nenhuma estrutura carregada</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Selecione uma versão no painel lateral</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">

      {/* ── Search bar ─────────────────────────────────────────── */}
      <div className="shrink-0 px-3 pt-3 pb-2 border-b border-slate-200 dark:border-slate-800/60">
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={handleInput}
            placeholder="Buscar campo / tag no XSD..."
            className={[
              'w-full pl-7 pr-7 py-2 text-[11px] font-mono rounded-xl',
              'bg-slate-100 dark:bg-slate-800/60',
              'border border-slate-300 dark:border-slate-700/60',
              'text-slate-800 dark:text-slate-200',
              'placeholder:text-slate-400 dark:placeholder:text-slate-600',
              'focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/40',
              'transition-all duration-200',
            ].join(' ')}
          />
          {isSearching && (
            <Loader2 size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 animate-spin" />
          )}
          {!isSearching && query && (
            <button
              onClick={handleClear}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X size={11} />
            </button>
          )}
        </div>

        {resultCount !== null && (
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 pl-0.5">
            {resultCount === 0
              ? 'Nenhum campo encontrado'
              : `${resultCount} resultado${resultCount !== 1 ? 's' : ''} — exibindo o primeiro`}
          </p>
        )}
      </div>

      {/* ── Tree header ────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center gap-2 px-4 py-2 border-b border-slate-200 dark:border-slate-800/40 bg-slate-100/60 dark:bg-slate-900/30">
        <GitBranch size={11} className="text-slate-400 dark:text-slate-500 shrink-0" />
        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate">
          {rootNode.name}
        </span>
        <span className="flex items-center gap-1.5 text-[9px] text-slate-400 dark:text-slate-600 ml-auto">
          <MousePointerClick size={9} /> Clique para inspecionar
        </span>
      </div>

      {/* ── Tree nodes ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-2">
        <TreeNode
          node={rootNode}
          depth={0}
          nodeCache={nodeCache}
          onExpand={onExpand}
          onSelect={onSelect}
          selectedId={selectedId}
          highlightedId={highlightedId}
        />
      </div>

    </div>
  );
}
