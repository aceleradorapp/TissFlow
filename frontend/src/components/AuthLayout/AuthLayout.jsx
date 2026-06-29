const AUTH_GRID = {
  backgroundImage:
    'linear-gradient(to right,rgba(30,41,59,.9) 1px,transparent 1px),' +
    'linear-gradient(to bottom,rgba(30,41,59,.9) 1px,transparent 1px)',
  backgroundSize: '60px 60px',
};

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 relative overflow-hidden py-12">

      {/* Grid pattern */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true" style={AUTH_GRID} />

      {/* Floating orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="animate-float absolute -top-40 -left-40 w-[520px] h-[520px]
                        rounded-full bg-blue-500/10 blur-3xl" />
        <div className="animate-float-alt absolute -bottom-40 -right-20 w-[480px] h-[480px]
                        rounded-full bg-emerald-500/10 blur-3xl" />
        <div
          className="animate-float absolute top-1/3 right-1/4 w-[380px] h-[380px]
                      rounded-full bg-purple-500/10 blur-3xl"
          style={{ animationDelay: '-9s' }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
