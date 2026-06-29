import { useState } from 'react';
import { PlusCircle } from 'lucide-react';

// ── Status styling ────────────────────────────────────────────────────────────

const STATUS_RING = {
  valid:   'border-emerald-400/60 dark:border-emerald-500/40',
  error:   'border-red-400/70 dark:border-red-500/50',
  warning: 'border-amber-400/60 dark:border-amber-500/40',
  missing: 'border-red-500/70 dark:border-red-500/60',
  empty:   'border-slate-300 dark:border-slate-700/60',
};

const STATUS_BG = {
  valid:   'bg-white dark:bg-slate-950/50',
  error:   'bg-red-50/60 dark:bg-red-950/20',
  warning: 'bg-amber-50/40 dark:bg-amber-950/10',
  missing: 'bg-red-50/80 dark:bg-red-950/30',
  empty:   'bg-white dark:bg-slate-950/50',
};

const STATUS_TEXT = {
  valid:   'text-emerald-700 dark:text-emerald-400',
  error:   'text-red-600 dark:text-red-400',
  warning: 'text-amber-700 dark:text-amber-400',
  missing: 'text-red-700 dark:text-red-400',
  empty:   'text-slate-400',
};

// ── Enum (select) ─────────────────────────────────────────────────────────────

function EnumInput({ value, enums, onChange, disabled }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const filtered = enums.filter(e => e.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        className="w-full text-left px-3 py-2 rounded-lg text-sm font-mono
                   bg-slate-100 dark:bg-slate-800/60
                   border border-slate-300 dark:border-slate-700/60
                   text-slate-800 dark:text-slate-200
                   disabled:opacity-40 disabled:cursor-not-allowed
                   focus:outline-none focus:ring-2 focus:ring-blue-500/30"
      >
        {value || <span className="text-slate-400 dark:text-slate-500">Selecionar...</span>}
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-1 rounded-xl shadow-2xl shadow-black/30
                        bg-white dark:bg-slate-900
                        border border-slate-200 dark:border-slate-700/60
                        overflow-hidden max-h-52">
          <div className="p-2 border-b border-slate-100 dark:border-slate-800">
            <input
              autoFocus
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filtrar..."
              className="w-full px-2 py-1 rounded-lg text-xs
                         bg-slate-100 dark:bg-slate-800
                         text-slate-800 dark:text-slate-200
                         border border-slate-300 dark:border-slate-700
                         focus:outline-none"
            />
          </div>
          <ul className="overflow-y-auto max-h-40">
            {filtered.slice(0, 80).map(e => (
              <li key={e}>
                <button
                  type="button"
                  onClick={() => { onChange(e); setOpen(false); setSearch(''); }}
                  className={[
                    'w-full text-left px-3 py-1.5 text-xs font-mono',
                    'hover:bg-blue-50 dark:hover:bg-blue-900/30',
                    value === e
                      ? 'text-blue-600 dark:text-blue-400 font-semibold'
                      : 'text-slate-700 dark:text-slate-300',
                  ].join(' ')}
                >
                  {e}
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-xs text-slate-400 dark:text-slate-600 italic">
                Nenhuma opção encontrada
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Main NodeField ─────────────────────────────────────────────────────────────

export default function NodeField({ node, onValueChange, onToggleEnabled, onInsert }) {
  const { tag, value, inputType, enums, status, errors, isPresent, isRequired, isEnabled } = node;

  // Ghost: missing required field
  if (!isPresent && isRequired) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg
                      bg-red-500/10 border border-dashed border-red-400/50
                      text-red-600 dark:text-red-400">
        <span className="text-[11px] font-mono flex-1 opacity-70">
          &lt;{tag}&gt; — obrigatória, ausente
        </span>
        <button
          type="button"
          onClick={() => onInsert(node)}
          className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md
                     bg-red-500/20 hover:bg-red-500/30 transition-colors"
        >
          <PlusCircle size={11} />
          Inserir
        </button>
      </div>
    );
  }

  // Optional inactive (checkbox off)
  if (!isEnabled && !isRequired) {
    return (
      <label className="flex items-center gap-2.5 px-3 py-2 rounded-lg opacity-40 cursor-pointer
                        hover:opacity-60 transition-opacity
                        border border-slate-200 dark:border-slate-800">
        <input
          type="checkbox"
          checked={false}
          onChange={() => onToggleEnabled(node)}
          className="w-3.5 h-3.5 rounded border-slate-400 dark:border-slate-600 accent-blue-500"
        />
        <span className="text-[11px] font-mono text-slate-500 dark:text-slate-500">
          &lt;{tag}&gt; <span className="italic">(opcional)</span>
        </span>
      </label>
    );
  }

  // Active field
  const border = STATUS_RING[status] ?? STATUS_RING.empty;
  const bg     = STATUS_BG[status]   ?? STATUS_BG.empty;

  function handleChange(newVal) {
    onValueChange(node, newVal);
  }

  const labelEl = (
    <div className="flex items-center justify-between mb-1">
      <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">
        {tag}
        {isRequired
          ? <span className="text-red-400 dark:text-red-500 ml-0.5">*</span>
          : <span
              onClick={() => onToggleEnabled({ ...node, isEnabled: false })}
              className="ml-2 text-[9px] text-slate-400 hover:text-red-400 cursor-pointer"
              title="Remover campo opcional"
            >× retirar</span>
        }
      </span>
      {status !== 'empty' && status !== 'valid' && (
        <span className={`text-[9px] font-bold uppercase ${STATUS_TEXT[status]}`}>
          {status === 'missing' ? 'ausente' : status === 'error' ? 'erro' : 'aviso'}
        </span>
      )}
    </div>
  );

  let inputEl;

  if (inputType === 'enum') {
    inputEl = <EnumInput value={value} enums={enums} onChange={handleChange} />;
  } else if (inputType === 'date') {
    inputEl = (
      <input
        type="date"
        value={value ?? ''}
        onChange={e => handleChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg text-sm
                   bg-slate-100 dark:bg-slate-800/60
                   border border-slate-300 dark:border-slate-700/60
                   text-slate-800 dark:text-slate-200
                   focus:outline-none focus:ring-2 focus:ring-blue-500/30"
      />
    );
  } else if (inputType === 'time') {
    inputEl = (
      <input
        type="time"
        step="1"
        value={value ?? ''}
        onChange={e => handleChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg text-sm font-mono
                   bg-slate-100 dark:bg-slate-800/60
                   border border-slate-300 dark:border-slate-700/60
                   text-slate-800 dark:text-slate-200
                   focus:outline-none focus:ring-2 focus:ring-blue-500/30"
      />
    );
  } else if (inputType === 'number') {
    inputEl = (
      <input
        type="number"
        value={value ?? ''}
        onChange={e => handleChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg text-sm font-mono
                   bg-slate-100 dark:bg-slate-800/60
                   border border-slate-300 dark:border-slate-700/60
                   text-slate-800 dark:text-slate-200
                   focus:outline-none focus:ring-2 focus:ring-blue-500/30"
      />
    );
  } else {
    inputEl = (
      <input
        type="text"
        value={value ?? ''}
        onChange={e => handleChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg text-sm font-mono
                   bg-slate-100 dark:bg-slate-800/60
                   border border-slate-300 dark:border-slate-700/60
                   text-slate-800 dark:text-slate-200
                   focus:outline-none focus:ring-2 focus:ring-blue-500/30"
      />
    );
  }

  return (
    <div className={`rounded-xl border px-3 py-2.5 ${border} ${bg}`}>
      {labelEl}
      {inputEl}
      {errors?.length > 0 && (
        <ul className="mt-1.5 space-y-0.5">
          {errors.map((e, i) => (
            <li key={i} className="text-[10px] text-red-500 dark:text-red-400 leading-tight">
              ⚠ {e}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
