export default function Input({
  label,
  error,
  icon: Icon,
  className = '',
  id,
  ...props
}) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          {label}
        </label>
      )}

      <div className="relative">
        {Icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none
                           text-slate-400 dark:text-slate-500">
            <Icon size={16} />
          </span>
        )}

        <input
          id={inputId}
          {...props}
          className={[
            'w-full py-2.5 rounded-xl text-sm',
            'bg-white dark:bg-slate-900',
            'text-slate-900 dark:text-slate-50',
            'placeholder:text-slate-400 dark:placeholder:text-slate-500',
            'transition-all duration-200',
            'focus:outline-none focus:ring-2',
            error
              ? 'border border-red-500 dark:border-red-500 focus:ring-red-500'
              : 'border border-slate-200 dark:border-slate-700 focus:ring-blue-500 dark:focus:ring-blue-400',
            Icon ? 'pl-9 pr-4' : 'px-4',
            className,
          ].join(' ')}
        />
      </div>

      {error && (
        <p className="text-xs text-red-500 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
