import { useState, useEffect } from 'react';
import { Users as UsersIcon, Search } from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '../../../components/DashboardLayout';
import api from '../../../services/api';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS = { active: 'Ativo', inactive: 'Inativo', suspended: 'Suspenso' };
const ROLE_LABELS   = { proprietario: 'Proprietário', prestador: 'Prestador' };

const STATUS_BADGE = {
  active:    'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  inactive:  'bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-600/40',
  suspended: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30',
};

const SELECT_BASE = [
  'text-xs rounded-lg px-2.5 py-1.5 cursor-pointer appearance-none',
  'bg-white dark:bg-slate-800/80',
  'border border-slate-200 dark:border-slate-700/60',
  'text-slate-700 dark:text-slate-300',
  'focus:outline-none focus:ring-1 focus:ring-blue-500/60',
  'transition-all duration-200',
  'disabled:opacity-40 disabled:cursor-not-allowed',
].join(' ');

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso.replace(' ', 'T')).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminUsers() {
  const [users,   setUsers]   = useState([]);
  const [plans,   setPlans]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');

  const currentUser = JSON.parse(localStorage.getItem('tissflow_user') ?? 'null');

  useEffect(() => {
    Promise.all([
      api.get('/admin/users'),
      api.get('/admin/plans'),
    ])
      .then(([usersRes, plansRes]) => {
        setUsers(usersRes.data.users);
        setPlans(plansRes.data.plans);
      })
      .catch(() => toast.error('Erro ao carregar dados.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  async function handleStatusChange(userId, newStatus) {
    if (userId === currentUser?.id) {
      toast.error('Você não pode alterar o status da sua própria conta.');
      return;
    }
    try {
      await api.patch(`/admin/users/${userId}/status`, { status: newStatus });
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, status: newStatus } : u));
      toast.success(`Status alterado para "${STATUS_LABELS[newStatus]}".`);
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Erro ao atualizar status.');
    }
  }

  async function handleRoleChange(userId, newRole) {
    if (userId === currentUser?.id) {
      toast.error('Você não pode alterar o tipo da sua própria conta.');
      return;
    }
    try {
      await api.patch(`/admin/users/${userId}/role`, { role_name: newRole });
      setUsers((prev) =>
        prev.map((u) => u.id === userId
          ? { ...u, role: { ...(u.role ?? {}), name: newRole } }
          : u
        )
      );
      toast.success(`Tipo alterado para "${ROLE_LABELS[newRole]}".`);
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Erro ao atualizar tipo.');
    }
  }

  async function handlePlanChange(userId, newPlanId) {
    const planIdNum = newPlanId === '' ? null : Number(newPlanId);
    const plan = plans.find((p) => p.id === planIdNum) ?? null;
    setUsers((prev) =>
      prev.map((u) => u.id === userId
        ? { ...u, plan_id: planIdNum, plan }
        : u
      )
    );
    try {
      await api.patch(`/admin/users/${userId}/plan`, { plan_id: planIdNum });
      toast.success(planIdNum ? `Plano "${plan?.name}" atribuído.` : 'Plano removido.');
    } catch (err) {
      api.get('/admin/users').then(({ data }) => setUsers(data.users)).catch(() => {});
      toast.error(err.response?.data?.error ?? 'Erro ao atualizar plano.');
    }
  }

  const isSelf = (userId) => userId === currentUser?.id;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <UsersIcon className="text-blue-500 dark:text-blue-400" size={22} />
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">
                Gerenciamento de Usuários
              </h1>
              <p className="text-slate-500 text-xs mt-0.5">
                {users.length} usuário{users.length !== 1 ? 's' : ''} cadastrado{users.length !== 1 ? 's' : ''}
                {search && ` · ${filtered.length} encontrado${filtered.length !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Pesquisar por nome ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-sm pl-9 pr-4 py-2.5 text-sm rounded-xl
                       bg-white dark:bg-slate-900/60
                       border border-slate-200 dark:border-slate-800/60
                       text-slate-800 dark:text-slate-200
                       placeholder:text-slate-400 dark:placeholder:text-slate-600
                       focus:outline-none focus:ring-1 focus:ring-blue-500/60 focus:border-blue-500/40
                       transition-all duration-200"
          />
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900/40
                          border border-slate-200 dark:border-slate-800/60
                          rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">

                {/* Head */}
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800/60
                                 bg-slate-50 dark:bg-slate-800/40">
                    {['Usuário', 'Plano', 'Tipo', 'Status', 'Cadastro'].map((h) => (
                      <th
                        key={h}
                        className="text-left py-3 px-4 text-xs font-semibold
                                   text-slate-500 uppercase tracking-wider whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                {/* Body */}
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400 dark:text-slate-600 text-sm">
                        {search
                          ? `Nenhum usuário encontrado para "${search}"`
                          : 'Nenhum usuário cadastrado.'}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((user) => (
                      <tr
                        key={user.id}
                        className={[
                          'border-b border-slate-100 dark:border-slate-800/40 transition-colors duration-150',
                          isSelf(user.id)
                            ? 'bg-blue-500/[0.04]'
                            : 'hover:bg-slate-50 dark:hover:bg-white/[0.025]',
                        ].join(' ')}
                      >

                        {/* Usuário (nome + email) */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full
                                            bg-slate-100 dark:bg-slate-800
                                            flex items-center justify-center
                                            text-xs font-bold
                                            text-slate-500 dark:text-slate-400
                                            shrink-0">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium text-slate-800 dark:text-slate-100 truncate">
                                  {user.name}
                                </span>
                                {isSelf(user.id) && (
                                  <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-md
                                                   bg-blue-500/20 text-blue-600 dark:text-blue-400
                                                   border border-blue-500/30">
                                    Você
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 truncate">{user.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* Plano (dropdown) */}
                        <td className="py-3.5 px-4">
                          <select
                            value={user.plan?.id ?? ''}
                            onChange={(e) => handlePlanChange(user.id, e.target.value)}
                            className={SELECT_BASE}
                          >
                            <option value="">— sem plano —</option>
                            {plans.map((p) => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </td>

                        {/* Tipo (role dropdown) */}
                        <td className="py-3.5 px-4">
                          <select
                            value={user.role?.name ?? 'prestador'}
                            onChange={(e) => handleRoleChange(user.id, e.target.value)}
                            disabled={isSelf(user.id)}
                            title={isSelf(user.id) ? 'Você não pode alterar sua própria conta' : undefined}
                            className={SELECT_BASE}
                          >
                            <option value="prestador">Prestador</option>
                            <option value="proprietario">Proprietário</option>
                          </select>
                        </td>

                        {/* Status (dropdown) */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded-md text-xs font-medium border ${STATUS_BADGE[user.status]}`}>
                              {STATUS_LABELS[user.status]}
                            </span>
                            <select
                              value={user.status}
                              onChange={(e) => handleStatusChange(user.id, e.target.value)}
                              disabled={isSelf(user.id)}
                              title={isSelf(user.id) ? 'Você não pode alterar sua própria conta' : undefined}
                              className={SELECT_BASE}
                            >
                              <option value="active">Ativo</option>
                              <option value="inactive">Inativo</option>
                              <option value="suspended">Suspenso</option>
                            </select>
                          </div>
                        </td>

                        {/* Data de cadastro */}
                        <td className="py-3.5 px-4">
                          <span className="text-xs text-slate-500 font-mono tabular-nums">
                            {fmtDate(user.createdAt)}
                          </span>
                        </td>

                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
