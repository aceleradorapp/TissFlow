import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, User, LogOut,
  ChevronLeft, ChevronRight,
  Menu, X, Sun, Moon, Stethoscope,
  Users, Package, ScrollText, FileCode2, Network, Sparkles, Wrench, ScanSearch, Code2, GitCompare, Settings,
} from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext';

const USER_NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/account',   icon: User,            label: 'Minha Conta' },
];

const ADMIN_NAV = [
  { to: '/admin/dashboard',              icon: LayoutDashboard, label: 'Visão Geral'     },
  { to: '/admin/users',                  icon: Users,           label: 'Usuários'        },
  { to: '/admin/plans',                  icon: Package,         label: 'Planos'          },
  { to: '/admin/features',               icon: Wrench,          label: 'Ferramentas'     },
  { to: '/admin/tiss/ingestion',         icon: FileCode2,       label: 'Módulos XSD'     },
  { to: '/admin/tools/version-diff',     icon: GitCompare,      label: 'Diff de Versões' },
  { to: '/admin/settings',              icon: Settings,         label: 'Configurações'   },
];

const TOOLS_NAV = [
  { to: '/tools/swagger',       icon: Network,      label: 'Swagger TISS'          },
  { to: '/tools/generator',     icon: Sparkles,     label: 'Gerador XML/JSON'      },
  { to: '/tools/viewer',        icon: ScanSearch,   label: 'Visualizador TISS'     },
  { to: '/tools/ide',           icon: Code2,        label: 'IDE Interativa TISS'   },
  { to: '/tools/version-diff',  icon: GitCompare,   label: 'Comparador de Versões' },
];

export default function DashboardLayout({ children }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { systemName } = useSettings();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed,  setCollapsed]  = useState(false);
  const [isDark,     setIsDark]     = useState(
    () => document.documentElement.classList.contains('dark')
  );

  const storedUser = JSON.parse(localStorage.getItem('tissflow_user') ?? 'null');
  const isAdmin    = storedUser?.role === 'proprietario';

  function toggleDark() {
    const nowDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('tissflow_theme', nowDark ? 'dark' : 'light');
    setIsDark(nowDark);
  }

  function logout() {
    localStorage.removeItem('tissflow_token');
    localStorage.removeItem('tissflow_user');
    navigate('/login');
  }

  const navLinkClass = (to) => [
    'flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 w-full',
    'transition-all duration-200 text-sm font-medium',
    location.pathname === to
      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-50',
    collapsed ? 'lg:justify-center lg:px-0' : '',
  ].join(' ');

  const actionBtnClass = (danger = false) => [
    'flex items-center gap-3 px-3 py-2.5 rounded-xl w-full',
    'transition-all duration-200 text-sm font-medium',
    danger
      ? 'text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-50',
    collapsed ? 'lg:justify-center lg:px-0' : '',
  ].join(' ');

  const NavLink = ({ to, icon: Icon, label }) => (
    <Link
      to={to}
      onClick={() => setMobileOpen(false)}
      className={navLinkClass(to)}
    >
      <Icon size={18} className="shrink-0" />
      <span className={collapsed ? 'lg:hidden' : ''}>{label}</span>
    </Link>
  );

  const SectionLabel = ({ text }) => (
    <p className={[
      'px-3 pt-3 pb-1 text-xs font-semibold uppercase tracking-wider',
      'text-slate-400 dark:text-slate-500',
      collapsed ? 'lg:hidden' : '',
    ].join(' ')}>
      {text}
    </p>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">

      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside className={[
        'fixed top-0 left-0 h-full z-30 flex flex-col',
        'lg:relative lg:z-auto lg:shrink-0',
        'bg-white dark:bg-slate-900',
        'border-r border-slate-200 dark:border-slate-800',
        'transition-all duration-300 ease-in-out',
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        'w-64',
        collapsed ? 'lg:w-16' : 'lg:w-64',
      ].join(' ')}>

        {/* Logo */}
        <div className={[
          'flex items-center h-16 px-4',
          'border-b border-slate-200 dark:border-slate-800',
          collapsed ? 'lg:justify-center' : 'justify-between',
        ].join(' ')}>
          <div className="flex items-center gap-2.5 overflow-hidden">
            <Stethoscope className="text-blue-600 dark:text-blue-500 shrink-0" size={22} />
            <span className={['font-bold text-slate-900 dark:text-slate-50 whitespace-nowrap', collapsed ? 'lg:hidden' : ''].join(' ')}>
              {systemName}
            </span>
          </div>
          <button onClick={() => setCollapsed((c) => !c)}
                  className="hidden lg:flex p-1.5 rounded-lg text-slate-400
                             hover:text-slate-600 dark:hover:text-slate-200
                             hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200">
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
          <button onClick={() => setMobileOpen(false)}
                  className="lg:hidden p-1.5 rounded-lg text-slate-400
                             hover:text-slate-600 dark:hover:text-slate-200">
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 sidebar-nav">
          {isAdmin ? (
            <>
              <SectionLabel text="Admin" />
              {ADMIN_NAV.map((item) => <NavLink key={item.to} {...item} />)}

              {/* Logs do Sistema — Em breve */}
              <div className={[
                'flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5',
                'cursor-not-allowed opacity-40 select-none',
                collapsed ? 'lg:justify-center lg:px-0' : '',
              ].join(' ')}>
                <ScrollText size={18} className="shrink-0 text-slate-500" />
                <span className={['text-sm font-medium text-slate-500', collapsed ? 'lg:hidden' : ''].join(' ')}>
                  Logs do Sistema
                </span>
                <span className={[
                  'ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-md',
                  'bg-slate-800 text-slate-500 border border-slate-700/60 whitespace-nowrap',
                  collapsed ? 'lg:hidden' : '',
                ].join(' ')}>
                  Em breve
                </span>
              </div>

              <SectionLabel text="Geral" />
              {USER_NAV.map((item) => <NavLink key={item.to} {...item} />)}

              <SectionLabel text="Ferramentas" />
              {TOOLS_NAV.map((item) => <NavLink key={item.to} {...item} />)}
            </>
          ) : (
            <>
              {USER_NAV.map((item) => <NavLink key={item.to} {...item} />)}
              <SectionLabel text="Ferramentas" />
              {TOOLS_NAV.map((item) => <NavLink key={item.to} {...item} />)}
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-200 dark:border-slate-800 p-2 flex flex-col gap-0.5">
          <button onClick={toggleDark} className={actionBtnClass()}>
            {isDark ? <Sun size={18} className="shrink-0" /> : <Moon size={18} className="shrink-0" />}
            <span className={collapsed ? 'lg:hidden' : ''}>{isDark ? 'Tema Claro' : 'Tema Escuro'}</span>
          </button>
          <button onClick={logout} className={actionBtnClass(true)}>
            <LogOut size={18} className="shrink-0" />
            <span className={collapsed ? 'lg:hidden' : ''}>Sair</span>
          </button>
        </div>
      </aside>

      {/* ── Conteúdo ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="lg:hidden flex items-center gap-3 px-4 h-16 shrink-0
                           bg-white dark:bg-slate-900
                           border-b border-slate-200 dark:border-slate-800">
          <button onClick={() => setMobileOpen(true)}
                  className="p-1.5 rounded-lg text-slate-500
                             hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <Stethoscope className="text-blue-600 dark:text-blue-500" size={20} />
            <span className="font-bold text-slate-900 dark:text-slate-50">{systemName}</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
