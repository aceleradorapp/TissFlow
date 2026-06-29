import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import NodeField from './NodeField';

// ── Status → accordion color ──────────────────────────────────────────────────

const HEADER_CLASS = {
  valid:   'border-emerald-400/30 dark:border-emerald-600/20 bg-emerald-50/40 dark:bg-emerald-900/5',
  error:   'border-red-400/40 dark:border-red-600/25 bg-red-50/40 dark:bg-red-950/10',
  warning: 'border-amber-400/30 dark:border-amber-600/20 bg-amber-50/30 dark:bg-amber-900/5',
  missing: 'border-red-500/50 dark:border-red-500/30 bg-red-50/60 dark:bg-red-950/15',
  empty:   'border-slate-200 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-900/30',
  pending: 'border-slate-200 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-900/30',
};

const DOT_CLASS = {
  valid:   'bg-emerald-400 dark:bg-emerald-500',
  error:   'bg-red-400 dark:bg-red-500',
  warning: 'bg-amber-400 dark:bg-amber-500',
  missing: 'bg-red-500 animate-pulse',
  empty:   'bg-slate-300 dark:bg-slate-700',
  pending: 'bg-slate-300 dark:bg-slate-700',
};

// ── Accordion node ────────────────────────────────────────────────────────────

function AccordionNode({ node, depth, onValueChange, onToggleEnabled, onInsert }) {
  const [open, setOpen] = useState(depth < 2);

  const isLeaf     = node.children.length === 0 || node.inputType !== 'complex';
  const isOptional = !node.isRequired;
  const status     = node.status ?? 'empty';

  // Leaf node — delegate to NodeField
  if (isLeaf) {
    return (
      <div className="ml-1">
        <NodeField
          node={node}
          onValueChange={onValueChange}
          onToggleEnabled={onToggleEnabled}
          onInsert={onInsert}
        />
      </div>
    );
  }

  // Optional complex node that has been disabled — show as an inactive tag with
  // no children so they don't pollute the tree visually
  if (isOptional && !node.isEnabled) {
    return (
      <label className="flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer
                        border border-slate-200 dark:border-slate-800
                        opacity-40 hover:opacity-60 transition-opacity select-none">
        <input
          type="checkbox"
          checked={false}
          onChange={() => onToggleEnabled(node)}
          className="w-3.5 h-3.5 rounded border-slate-400 dark:border-slate-600 accent-blue-500"
        />
        <span className="text-[11px] font-medium font-mono text-slate-400 dark:text-slate-400">
          &lt;{node.tag}&gt;
          <span className="ml-1.5 italic font-normal">(opcional)</span>
        </span>
      </label>
    );
  }

  const errorCount  = countErrors(node);
  const headerClass = HEADER_CLASS[status] ?? HEADER_CLASS.empty;

  return (
    <div className={`rounded-xl border overflow-hidden mb-2 ${headerClass}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left
                   hover:brightness-[0.97] dark:hover:brightness-110 transition-all duration-150"
      >
        {/* Status dot */}
        <span className={`w-2 h-2 rounded-full shrink-0 ${DOT_CLASS[status] ?? DOT_CLASS.empty}`} />

        {/* Tag name */}
        <span className="text-xs font-semibold font-mono text-slate-700 dark:text-slate-300 flex-1 truncate">
          {node.tag}
        </span>

        {/* "× retirar" for optional enabled complex nodes */}
        {isOptional && node.isEnabled && (
          <span
            role="button"
            tabIndex={0}
            onClick={e => { e.stopPropagation(); onToggleEnabled(node); }}
            onKeyDown={e => e.key === 'Enter' && onToggleEnabled(node)}
            className="text-[9px] text-slate-400 hover:text-red-400 cursor-pointer px-1 transition-colors"
            title="Remover campo opcional"
          >
            × retirar
          </span>
        )}

        {/* Error count badge */}
        {errorCount > 0 && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full
                           bg-red-500/15 text-red-600 dark:text-red-400
                           border border-red-400/30">
            {errorCount} erro{errorCount !== 1 ? 's' : ''}
          </span>
        )}

        {open
          ? <ChevronDown  size={12} className="text-slate-400 shrink-0" />
          : <ChevronRight size={12} className="text-slate-400 shrink-0" />
        }
      </button>

      {open && (
        <div className={`px-3 pb-3 space-y-2 ${depth > 0 ? 'pl-5 border-l border-slate-200/60 dark:border-slate-800/40 ml-3' : ''}`}>
          {node.children.map(child => (
            <AccordionNode
              key={child.id}
              node={child}
              depth={depth + 1}
              onValueChange={onValueChange}
              onToggleEnabled={onToggleEnabled}
              onInsert={onInsert}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function countErrors(node) {
  let count = (node.errors?.length ?? 0) + (node.status === 'missing' ? 1 : 0);
  for (const c of node.children ?? []) count += countErrors(c);
  return count;
}

// ── Main TreePane ─────────────────────────────────────────────────────────────

export default function TreePane({ tree, onValueChange, onToggleEnabled, onInsert }) {
  if (!tree) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-slate-400 dark:text-slate-600">
        Nenhum XML carregado.
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-3">
      <AccordionNode
        node={tree}
        depth={0}
        onValueChange={onValueChange}
        onToggleEnabled={onToggleEnabled}
        onInsert={onInsert}
      />
    </div>
  );
}
