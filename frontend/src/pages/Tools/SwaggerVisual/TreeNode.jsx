import { ChevronRight, Folder, FolderOpen, Loader2, Tag } from 'lucide-react';

export default function TreeNode({
  node, depth,
  nodeCache, onExpand, onSelect,
  selectedId, highlightedId,
}) {
  // Cache is keyed by node.path (unique tree position, e.g. "mensagemTISS.cabecalho")
  const state = nodeCache[node.path] ?? { isOpen: false, children: null, isLoading: false };

  // Unwrap defensively: cache should store the flat array, but guard against the
  // envelope object { children: [...] } leaking in from a race or stale update.
  const childrenArray = Array.isArray(state.children)
    ? state.children
    : (state.children?.children && Array.isArray(state.children.children)
        ? state.children.children
        : []);

  const childrenLoaded = state.children !== null;
  const isExpandable   = !node.isLeaf && (childrenLoaded ? childrenArray.length > 0 : true);
  const showChildren   = state.isOpen && childrenLoaded && childrenArray.length > 0;

  // Required when minOccurs >= 1 (default in XSD is 1)
  const isRequired    = Number(node.minOccurs ?? '1') >= 1;
  const isSelected    = node.path === selectedId;
  const isHighlighted = node.path === highlightedId;

  function handleClick() {
    onSelect(node);
    if (!node.isLeaf) onExpand(node, state);
  }

  return (
    <div>
      {/* ── Row ──────────────────────────────────────────────── */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        className={[
          'flex items-center gap-1.5 py-[5px] pr-3 rounded-lg cursor-pointer select-none',
          'transition-colors duration-100 group',
          isHighlighted
            ? 'bg-yellow-400/10 border border-yellow-400/25'
            : isSelected
              ? 'bg-blue-500/15 border border-blue-500/20'
              : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.04] border border-transparent',
        ].join(' ')}
      >
        {/* Expand arrow / loader */}
        <span className="shrink-0 w-4 flex items-center justify-center">
          {state.isLoading ? (
            <Loader2 size={10} className="text-slate-400 dark:text-slate-600 animate-spin" />
          ) : isExpandable ? (
            <ChevronRight
              size={11}
              className={[
                'text-slate-400 dark:text-slate-600 transition-transform duration-200',
                state.isOpen ? 'rotate-90' : '',
              ].join(' ')}
            />
          ) : null}
        </span>

        {/* Icon */}
        {isExpandable ? (
          state.isOpen
            ? <FolderOpen size={13} className="shrink-0 text-yellow-500/70" />
            : <Folder     size={13} className="shrink-0 text-yellow-500/70" />
        ) : (
          <Tag size={12} className="shrink-0 text-slate-400 dark:text-slate-600" />
        )}

        {/* Name */}
        <span className={[
          'text-[13px] font-mono font-medium truncate flex-1 min-w-0',
          isHighlighted ? 'text-yellow-600 dark:text-yellow-300 font-bold'              :
          isSelected    ? 'text-blue-600 dark:text-blue-300 font-semibold'              :
          isRequired    ? 'text-blue-600 dark:text-blue-400'                            :
                          'text-slate-600 dark:text-slate-500 group-hover:text-slate-800 dark:group-hover:text-slate-300',
        ].join(' ')}>
          {node.name}
        </span>

        {/* Required dot */}
        {isRequired && !isHighlighted && !isSelected && (
          <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-blue-500/60" />
        )}

        {/* Type hint on hover (leaf nodes only) */}
        {node.isLeaf && node.type && (
          <span className="shrink-0 text-[9px] font-mono text-slate-400 dark:text-slate-700
                           opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            {node.type.replace(/^(__inline__|ct_|st_)/, '')}
          </span>
        )}
      </div>

      {/* ── Children lazy-loaded from nodeCache ──────────────── */}
      {showChildren && (
        <div className="animate-fade-slide-in">
          {childrenArray.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              nodeCache={nodeCache}
              onExpand={onExpand}
              onSelect={onSelect}
              selectedId={selectedId}
              highlightedId={highlightedId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
