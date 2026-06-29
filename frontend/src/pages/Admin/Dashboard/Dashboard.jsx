import { useState, useEffect } from 'react';
import {
  Users, UserPlus, CalendarDays, Cpu,
  TrendingUp, Activity, BarChart3, Package, AlertCircle, Loader2,
} from 'lucide-react';
import DashboardLayout from '../../../components/DashboardLayout';
import api from '../../../services/api';

// ─── Mock chart (analytics — fase futura) ────────────────────────────────────

const ACCESS_DATA = [
  { day: 'Seg', value: 42 },
  { day: 'Ter', value: 68 },
  { day: 'Qua', value: 55 },
  { day: 'Qui', value: 91 },
  { day: 'Sex', value: 73 },
  { day: 'Sáb', value: 28 },
  { day: 'Dom', value: 19 },
];
const ACCESS_MAX = Math.max(...ACCESS_DATA.map((d) => d.value));

// ─── Sub-components ───────────────────────────────────────────────────────────

function ImpactCard({ icon: Icon, label, value, trend, color, bg, loading }) {
  return (
    <div className="relative overflow-hidden
                    bg-white dark:bg-slate-900/60
                    border border-slate-200 dark:border-slate-800/60
                    rounded-2xl p-6
                    hover:border-slate-300 dark:hover:border-slate-700/60
                    hover:bg-slate-50 dark:hover:bg-slate-900/80
                    transition-all duration-300">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
          <Icon size={18} className={color} />
        </div>
        {trend && (
          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <TrendingUp size={12} />
            {trend}
          </span>
        )}
      </div>
      <p className="text-3xl font-extrabold text-slate-900 dark:text-slate-50 mb-1 tabular-nums">
        {loading ? <Loader2 size={20} className="text-slate-400 dark:text-slate-700 animate-spin" /> : value}
      </p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

function AccessChart() {
  return (
    <div className="flex flex-col gap-3.5">
      {ACCESS_DATA.map(({ day, value }) => (
        <div key={day} className="flex items-center gap-3">
          <span className="text-xs text-slate-500 w-7 text-right shrink-0 tabular-nums">{day}</span>
          <div className="flex-1 bg-slate-200 dark:bg-slate-800/60 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-700"
              style={{ width: `${(value / ACCESS_MAX) * 100}%` }}
            />
          </div>
          <span className="text-xs text-slate-400 dark:text-slate-500 w-6 text-right shrink-0 tabular-nums">{value}</span>
        </div>
      ))}
    </div>
  );
}

function PlanDistributionChart({ plans, loading }) {
  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col gap-1.5 animate-pulse">
            <div className="h-3 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800/60 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  const total = plans.reduce((s, p) => s + p.userCount, 0) || 1;

  if (plans.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <Package size={20} className="text-slate-400 dark:text-slate-700" />
        <span className="text-xs text-slate-500">Nenhum plano cadastrado.</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {plans.map((plan) => (
        <div key={plan.id} className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{plan.name}</span>
            <span className="text-[11px] tabular-nums text-slate-500">
              {plan.userCount} usuário{plan.userCount !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="flex-1 bg-slate-200 dark:bg-slate-800/60 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-700"
                style={{ width: `${(plan.userCount / total) * 100}%` }}
              />
            </div>
            <span className="text-[10px] tabular-nums text-slate-500 w-8 text-right shrink-0">
              {Math.round((plan.userCount / total) * 100)}%
            </span>
          </div>
          {plan.tools?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-0.5">
              {plan.tools.map((t) => (
                <span
                  key={t.id}
                  className="text-[9px] font-mono px-1.5 py-0.5 rounded
                             bg-slate-100 dark:bg-slate-800/60
                             text-slate-500 dark:text-slate-600
                             border border-slate-200 dark:border-slate-800"
                >
                  {t.slug}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  const storedUser = JSON.parse(localStorage.getItem('tissflow_user') ?? 'null');

  useEffect(() => {
    api.get('/admin/dashboard/stats')
      .then(({ data }) => setStats(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const now = new Date();

  const IMPACT_CARDS = [
    { icon: Users,        label: 'Total de Usuários',   value: stats?.totalUsers     ?? 0, color: 'text-blue-500',    bg: 'bg-blue-500/10'    },
    { icon: UserPlus,     label: 'Cadastros Hoje',       value: stats?.todaySignups   ?? 0, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { icon: CalendarDays, label: 'Cadastros na Semana',  value: stats?.weekSignups    ?? 0, color: 'text-purple-500',  bg: 'bg-purple-500/10'  },
    { icon: Cpu,          label: 'Ferramentas Ativas',   value: stats?.activeFeatures ?? 0, color: 'text-amber-500',   bg: 'bg-amber-500/10'   },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <span className="inline-flex items-center text-xs font-mono font-bold px-2 py-0.5 rounded-md
                           bg-blue-500/10 text-blue-600 dark:text-blue-400
                           border border-blue-500/30 mb-3">
            ADMIN · SISTEMA
          </span>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Visão Geral</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {storedUser?.name
              ? `Bem-vindo de volta, ${storedUser.name.split(' ')[0]} —`
              : 'Centro de comando —'}{' '}
            {now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Error state */}
        {error && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl
                          bg-red-500/10 border border-red-500/20
                          text-red-600 dark:text-red-400 text-sm mb-6">
            <AlertCircle size={16} className="shrink-0" />
            Erro ao conectar com o banco de dados. Verifique se o backend está rodando.
          </div>
        )}

        {/* Impact cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {IMPACT_CARDS.map((card) => (
            <ImpactCard key={card.label} {...card} loading={loading} />
          ))}
        </div>

        {/* Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Access chart — simulado */}
          <div className="bg-white dark:bg-slate-900/60
                          border border-slate-200 dark:border-slate-800/60
                          rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <Activity size={15} className="text-blue-500 shrink-0" />
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Fluxo de Acesso — Últimos 7 Dias
              </h2>
              <span className="ml-auto text-[10px] font-mono
                               text-slate-400 dark:text-slate-600
                               bg-slate-100 dark:bg-slate-800/60
                               px-1.5 py-0.5 rounded">
                simulado
              </span>
            </div>
            <AccessChart />
          </div>

          {/* Plan distribution — real */}
          <div className="bg-white dark:bg-slate-900/60
                          border border-slate-200 dark:border-slate-800/60
                          rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 size={15} className="text-purple-500 shrink-0" />
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Distribuição por Plano
              </h2>
              <span className="ml-auto text-[10px] font-mono
                               text-emerald-600 bg-emerald-500/10
                               border border-emerald-500/20 px-1.5 py-0.5 rounded">
                real
              </span>
            </div>
            <PlanDistributionChart
              plans={stats?.planDistribution ?? []}
              loading={loading}
            />
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
