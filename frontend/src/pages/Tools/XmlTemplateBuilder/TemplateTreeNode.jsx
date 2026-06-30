import { ChevronRight, Folder, FolderOpen, Loader2, Tag } from 'lucide-react';

// ── High-contrast checkbox (alto contraste, conforme regras do projeto) ────

function TemplateCheckbox({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onChange}
      className={[
        'shrink-0 w-[16px] h-[16px] rounded border-2 flex items-center justify-center transition-all duration-150',
        disabled
          ? 'border-slate-300 dark:border-slate-800/60 cursor-not-allowed opacity-30'
          : checked
            ? 'bg-[#34d399] border-[#34d399] shadow-sm shadow-emerald-500/40 cursor-pointer'
            : 'bg-transparent border-slate-400 dark:border-slate-500 hover:border-[#34d399]/70 cursor-pointer',
      ].join(' ')}
      aria-checked={checked}
      role="checkbox"
    >
      {checked && !disabled && (
        <svg className="w-2.5 h-2.5 text-slate-950" viewBox="0 0 10 8" fill="none">
          <path d="M1 4l2.5 2.5L9 1" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}

// ── TemplateTreeNode ─────────────────────────────────────────────────────

export default function TemplateTreeNode({
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

  const isOptional = node.minOccurs === '0' || Number(node.minOccurs) === 0;
  const isChecked  = isOptional && checkedOptionals.has(node.path);
  const isRequired = !isOptional;

  const isDisabled      = parentIsDisabled;
  const childIsDisabled = isDisabled || (isOptional && !isChecked);
  // Linha "removida" do resultado final — sofre fade-out, mas permanece clicável para reativar.
  const isExcluded = !isDisabled && isOptional && !isChecked;

  function handleRowClick(e) {
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
          'transition-all duration-300 ease-out group',
          isDisabled
            ? 'opacity-40'
            : isExcluded
              ? 'opacity-35 hover:opacity-60'
              : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.04]',
        ].join(' ')}
      >
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

        {isOptional && (
          <TemplateCheckbox
            checked={isChecked}
            onChange={handleCheckbox}
            disabled={isDisabled}
          />
        )}

        {isExpandable ? (
          state.isOpen
            ? <FolderOpen size={13} className="shrink-0 text-[#fbbf24]/80" />
            : <Folder     size={13} className="shrink-0 text-[#fbbf24]/80" />
        ) : (
          <Tag size={12} className={isRequired ? 'shrink-0 text-[#60a5fa]' : 'shrink-0 text-slate-400 dark:text-slate-500'} />
        )}

        <span className={[
          'text-[13px] font-mono font-medium truncate flex-1 min-w-0',
          isRequired
            ? 'text-[#60a5fa] dark:text-[#60a5fa]'
            : isChecked
              ? 'text-slate-700 dark:text-[#f8fafc]'
              : 'text-slate-500 dark:text-slate-400 line-through decoration-slate-500/50',
        ].join(' ')}>
          {node.name}
        </span>

        {isRequired && (
          <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-[#60a5fa]" />
        )}
      </div>

      {showChildren && (
        <div>
          {childrenArray.map((child) => (
            <TemplateTreeNode
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
