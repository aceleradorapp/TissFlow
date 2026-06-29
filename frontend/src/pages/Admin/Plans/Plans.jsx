import { useState, useEffect } from 'react';
import { Package } from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '../../../components/DashboardLayout';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import api from '../../../services/api';

export default function AdminPlans() {
  const [plans,    setPlans]    = useState([]);
  const [allTools, setAllTools] = useState([]);
  const [selected, setSelected] = useState({}); // { planId: Set<toolId> }
  const [saving,   setSaving]   = useState(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([api.get('/admin/plans'), api.get('/admin/tools')])
      .then(([plansRes, toolsRes]) => {
        const plansData = plansRes.data.plans;
        setPlans(plansData);
        setAllTools(toolsRes.data.tools);
        const init = {};
        plansData.forEach((p) => {
          init[p.id] = new Set(p.tools.map((t) => t.id));
        });
        setSelected(init);
      })
      .catch(() => toast.error('Erro ao carregar dados.'))
      .finally(() => setLoading(false));
  }, []);

  function toggleTool(planId, toolId, checked) {
    setSelected((prev) => {
      const next = new Set(prev[planId]);
      checked ? next.add(toolId) : next.delete(toolId);
      return { ...prev, [planId]: next };
    });
  }

  async function handleSave(planId) {
    setSaving(planId);
    try {
      const toolIds = [...(selected[planId] ?? [])];
      await api.post(`/admin/plans/${planId}/tools`, { toolIds });
      toast.success('Ferramentas do plano atualizadas!');
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Erro ao salvar.');
    } finally {
      setSaving(null);
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Package className="text-blue-600 dark:text-blue-400" size={24} />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
              Gerenciamento de Planos
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
              Defina quais ferramentas cada plano oferece
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {plans.map((plan) => (
              <Card key={plan.id} className="flex flex-col gap-5">
                {/* Cabeçalho do plano */}
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-slate-50 text-lg">
                    {plan.name}
                  </h2>
                  <p className="text-emerald-600 dark:text-emerald-400 font-semibold text-sm mt-0.5">
                    R$ {Number(plan.price).toFixed(2).replace('.', ',')}
                  </p>
                </div>

                {/* Lista de ferramentas com checkboxes */}
                <div className="flex-1 border-t border-slate-100 dark:border-slate-800 pt-4">
                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-500
                                uppercase tracking-wider mb-3">
                    Ferramentas
                  </p>

                  {allTools.length === 0 ? (
                    <p className="text-xs text-slate-400">
                      Nenhuma ferramenta cadastrada.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      {allTools.map((tool) => (
                        <label
                          key={tool.id}
                          className="flex items-start gap-2.5 cursor-pointer group"
                        >
                          <input
                            type="checkbox"
                            checked={selected[plan.id]?.has(tool.id) ?? false}
                            onChange={(e) => toggleTool(plan.id, tool.id, e.target.checked)}
                            className="mt-0.5 w-4 h-4 rounded border-slate-300 dark:border-slate-600
                                       accent-blue-600 cursor-pointer"
                          />
                          <div>
                            <span className="text-sm text-slate-700 dark:text-slate-300
                                             group-hover:text-slate-900 dark:group-hover:text-slate-50
                                             transition-colors font-medium block leading-snug">
                              {tool.name}
                            </span>
                            {tool.description && (
                              <span className="text-xs text-slate-400 dark:text-slate-500 line-clamp-1">
                                {tool.description}
                              </span>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  variant="primary"
                  className="w-full"
                  isLoading={saving === plan.id}
                  onClick={() => handleSave(plan.id)}
                >
                  Salvar alterações
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
