import { useState, useEffect, useCallback } from 'react';
import {
  Wrench, Package, Loader2, CheckCircle2, XCircle, Power,
} from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '../../../components/DashboardLayout';
import api from '../../../services/api';

// ── Toggle switch ─────────────────────────────────────────────────────────────

function ToggleSwitch({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      className={[
        'relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent',
        'transition-colors duration-200 focus:outline-none',
        checked ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-90',
      ].join(' ')}
    >
      <span className={[
        'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow',
        'transform transition-transform duration-200',
        checked ? 'translate-x-5' : 'translate-x-0',
      ].join(' ')} />
    </button>
  );
}

// ── Feature card ──────────────────────────────────────────────────────────────

function FeatureCard({ feature, plans, saving, onToggleActive, onTogglePlan }) {
  const isSaving = saving[feature.id] ?? false;
  const planIds  = feature.plans.map((p) => p.id);

  return (
    <div className={[
      'bg-white dark:bg-slate-900/60 backdrop-blur-xl border rounded-2xl p-6',
      'transition-all duration-300',
      feature.is_active
        ? 'border-slate-200 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600/60'
        : 'border-slate-200/60 dark:border-slate-800/40 opacity-60',
    ].join(' ')}>

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className={[
            'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors',
            feature.is_active
              ? 'bg-blue-500/15'
              : 'bg-slate-100 dark:bg-slate-800',
          ].join(' ')}>
            <Wrench size={17} className={
              feature.is_active
                ? 'text-blue-500 dark:text-blue-400'
                : 'text-slate-400 dark:text-slate-600'
            } />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-900 dark:text-slate-50 text-sm leading-tight truncate">
              {feature.name}
            </h3>
            <code className="text-[11px] text-slate-500 font-mono">{feature.slug}</code>
          </div>
        </div>

        {/* Active toggle */}
        <div className="flex flex-col items-end gap-1 shrink-0 ml-4">
          <div className="flex items-center gap-2">
            {isSaving && <Loader2 size={11} className="text-slate-400 dark:text-slate-600 animate-spin" />}
            <ToggleSwitch
              checked={feature.is_active}
              onChange={() => onToggleActive(feature)}
              disabled={isSaving}
            />
          </div>
          <span className={[
            'text-[10px] font-semibold uppercase tracking-wide',
            feature.is_active
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-slate-400 dark:text-slate-600',
          ].join(' ')}>
            {feature.is_active ? 'Ativa' : 'Inativa'}
          </span>
        </div>
      </div>

      {/* Description */}
      {feature.description && (
        <p className="text-xs text-slate-500 mb-5 leading-relaxed">
          {feature.description}
        </p>
      )}

      {/* Divider */}
      <div className="border-t border-slate-200 dark:border-slate-800/60 mb-4" />

      {/* Plan associations */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Package size={11} className="text-slate-400 dark:text-slate-600 shrink-0" />
          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-600 uppercase tracking-wider">
            Planos com Acesso
          </span>
          <span className="ml-auto text-[10px] font-mono text-slate-400 dark:text-slate-700">
            {planIds.length}/{plans.length}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          {plans.map((plan) => {
            const isChecked = planIds.includes(plan.id);
            return (
              <label
                key={plan.id}
                className={[
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer select-none',
                  'border transition-all duration-150',
                  isChecked
                    ? 'border-blue-500/30 bg-blue-500/10'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 hover:border-slate-300 dark:hover:border-slate-700/60',
                  isSaving ? 'pointer-events-none opacity-50' : '',
                ].join(' ')}
                onClick={() => !isSaving && onTogglePlan(feature, plan.id)}
              >
                {/* Custom checkbox */}
                <span className={[
                  'w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all',
                  isChecked
                    ? 'bg-blue-600 border-blue-500'
                    : 'border-slate-300 dark:border-slate-600 bg-transparent',
                ].join(' ')}>
                  {isChecked && (
                    <svg viewBox="0 0 10 8" className="w-2.5 h-2.5" fill="none">
                      <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.8"
                            strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>

                <span className={[
                  'text-sm font-medium flex-1',
                  isChecked
                    ? 'text-slate-800 dark:text-slate-200'
                    : 'text-slate-500',
                ].join(' ')}>
                  {plan.name}
                </span>

                {isChecked
                  ? <CheckCircle2 size={13} className="text-blue-500 dark:text-blue-400 shrink-0" />
                  : <XCircle      size={13} className="text-slate-300 dark:text-slate-700 shrink-0" />}
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FeatureManagement() {
  const [features, setFeatures] = useState([]);
  const [plans,    setPlans]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState({});

  useEffect(() => {
    Promise.all([
      api.get('/admin/features'),
      api.get('/admin/plans'),
    ])
      .then(([featRes, planRes]) => {
        setFeatures(featRes.data.features);
        setPlans(planRes.data.plans.map((p) => ({ id: p.id, name: p.name })));
      })
      .catch(() => toast.error('Erro ao carregar ferramentas.'))
      .finally(() => setLoading(false));
  }, []);

  const callUpdate = useCallback(async (id, payload, optimisticFn) => {
    setSaving((s) => ({ ...s, [id]: true }));
    optimisticFn();
    try {
      const { data } = await api.put(`/admin/features/${id}`, payload);
      setFeatures((prev) => prev.map((f) => (f.id === id ? data.feature : f)));
      toast.success('Salvo com sucesso.');
    } catch {
      toast.error('Erro ao salvar. Revertendo...');
      api.get('/admin/features')
        .then((r) => setFeatures(r.data.features))
        .catch(() => {});
    } finally {
      setSaving((s) => ({ ...s, [id]: false }));
    }
  }, []);

  const handleToggleActive = useCallback((feature) => {
    callUpdate(
      feature.id,
      { is_active: !feature.is_active },
      () => setFeatures((prev) =>
        prev.map((f) => (f.id === feature.id ? { ...f, is_active: !f.is_active } : f)),
      ),
    );
  }, [callUpdate]);

  const handleTogglePlan = useCallback((feature, planId) => {
    const currentIds = feature.plans.map((p) => p.id);
    const isAdding   = !currentIds.includes(planId);
    const newIds     = isAdding
      ? [...currentIds, planId]
      : currentIds.filter((id) => id !== planId);

    callUpdate(
      feature.id,
      { plan_ids: newIds },
      () => setFeatures((prev) =>
        prev.map((f) => {
          if (f.id !== feature.id) return f;
          const newPlans = isAdding
            ? [...f.plans, { id: planId, name: plans.find((p) => p.id === planId)?.name ?? '' }]
            : f.plans.filter((p) => p.id !== planId);
          return { ...f, plans: newPlans };
        }),
      ),
    );
  }, [callUpdate, plans]);

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <span className="inline-flex items-center text-xs font-mono font-bold px-2 py-0.5 rounded-md
                           bg-blue-500/10 text-blue-600 dark:text-blue-400
                           border border-blue-500/30 mb-3">
            ADMIN · FERRAMENTAS
          </span>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Gestão de Ferramentas</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Ative, desative e vincule ferramentas aos planos de assinatura em tempo real.
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center h-64">
            <Loader2 size={28} className="text-slate-400 dark:text-slate-600 animate-spin" />
          </div>
        )}

        {/* Empty */}
        {!loading && features.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-24 text-center">
            <div className="w-14 h-14 rounded-2xl
                            bg-slate-100 dark:bg-slate-800/40
                            border border-slate-200 dark:border-slate-800
                            flex items-center justify-center">
              <Power size={22} className="text-slate-400 dark:text-slate-700" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Nenhuma ferramenta cadastrada</p>
              <p className="text-xs text-slate-400 dark:text-slate-700 mt-1">
                Execute o seeder de ferramentas para popular o banco.
              </p>
            </div>
          </div>
        )}

        {/* Grid */}
        {!loading && features.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {features.map((feature) => (
              <FeatureCard
                key={feature.id}
                feature={feature}
                plans={plans}
                saving={saving}
                onToggleActive={handleToggleActive}
                onTogglePlan={handleTogglePlan}
              />
            ))}
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
