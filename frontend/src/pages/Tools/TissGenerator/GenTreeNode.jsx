import { ChevronRight, Folder, FolderOpen, Loader2, Tag } from 'lucide-react';

// ── Custom checkbox ────────────────────────────────────────────────────────

function TissCheckbox({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onChange}
      className={[
        'shrink-0 w-[15px] h-[15px] rounded border-2 flex items-center justify-center transition-all duration-150',
        disabled
          ? 'border-slate-300 dark:border-slate-800/60 cursor-not-allowed opacity-30'
          : checked
            ? 'bg-blue-500 border-blue-400 shadow-sm shadow-blue-500/40 cursor-pointer'
            : 'bg-transparent border-slate-400 dark:border-slate-600 hover:border-blue-400/70 cursor-pointer',
      ].join(' ')}
      aria-checked={checked}
      role="checkbox"
    >
      {checked && !disabled && (
        <svg className="w-2 h-2 text-white" viewBox="0 0 10 8" fill="none">
          <path d="M1 4l2.5 2.5L9 1" stroke="currentColor" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}

// ── GenTreeNode ────────────────────────────────────────────────────────────

export default function GenTreeNode({
  node, depth,
  nodeCache, onExpand,
  checkedOptionals,
  onToggle,
  parentIsDisabled,
}) {
  const state = nodeCache[node.path] ?? { isOpen: false, children: null, isLoading: false };

  const childrenArray = Array.isArray(state.children)
    ? state.children
    : (Array.isArray(state.children?.children) ? state.children.children : []);

  const childrenLoaded = state.children !== null;
  const isExpandable   = !node.isLeaf && (childrenLoaded ? childrenArray.length > 0 : true);
  const showChildren   = state.isOpen && childrenLoaded && childrenArray.length > 0;

  const isOptional   = node.minOccurs === '0' || Number(node.minOccurs) === 0;
  const isChecked    = isOptional && checkedOptionals.has(node.path);
  const isRequired   = !isOptional;

  // This node is dimmed if any ancestor optional was unchecked
  const isDisabled   = parentIsDisabled;
  // Children of this node are disabled if this node is optional+unchecked OR already disabled
  const childIsDisabled = isDisabled || (isOptional && !isChecked);

  function handleRowClick(e) {
    // Don't expand when clicking the checkbox area
    if (e.target.closest('[role="checkbox"]')) return;
    if (!node.isLeaf) onExpand(node, state);
  }

  function handleCheckbox() {
    onToggle(node.path, isChecked);
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={handleRowClick}
        onKeyDown={(e) => e.key === 'Enter' && !isDisabled && handleRowClick(e)}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        className={[
          'flex items-center gap-2 py-[5px] pr-3 rounded-lg cursor-pointer select-none',
          'transition-all duration-100 group',
          isDisabled
            ? 'opacity-40'
            : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.04]',
        ].join(' ')}
      >
        {/* Expand chevron / loader */}
        <span className="shrink-0 w-4 flex items-center justify-center">
          {state.isLoading ? (
            <Loader2 size={10} className="text-slate-400 dark:text-slate-400 animate-spin" />
          ) : isExpandable ? (
            <ChevronRight
              size={11}
              className={[
                'text-slate-400 dark:text-slate-400 transition-transform duration-200',
                state.isOpen ? 'rotate-90' : '',
              ].join(' ')}
            />
          ) : null}
        </span>

        {/* Optional checkbox — esquerda, antes do ícone */}
        {isOptional && (
          <TissCheckbox
            checked={isChecked}
            onChange={handleCheckbox}
            disabled={isDisabled}
          />
        )}

        {/* Folder / tag icon */}
        {isExpandable ? (
          state.isOpen
            ? <FolderOpen size={13} className="shrink-0 text-yellow-500/70" />
            : <Folder     size={13} className="shrink-0 text-yellow-500/70" />
        ) : (
          <Tag size={12} className={isRequired ? 'shrink-0 text-blue-500/60 dark:text-blue-500/50' : 'shrink-0 text-slate-400 dark:text-slate-500'} />
        )}

        {/* Node name */}
        <span className={[
          'text-[13px] font-mono font-medium truncate flex-1 min-w-0',
          isRequired
            ? 'text-blue-600 dark:text-blue-300'
            : isChecked
              ? 'text-slate-700 dark:text-slate-200'
              : 'text-slate-500 dark:text-slate-400',
        ].join(' ')}>
          {node.name}
        </span>

        {/* Required indicator */}
        {isRequired && (
          <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-blue-500/60" />
        )}
      </div>

      {/* Children */}
      {showChildren && (
        <div>
          {childrenArray.map((child) => (
            <GenTreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              nodeCache={nodeCache}
              onExpand={onExpand}
              checkedOptionals={checkedOptionals}
              onToggle={onToggle}
              parentIsDisabled={childIsDisabled}
            />
          ))}
        </div>
      )}
    </div>
  );
}
