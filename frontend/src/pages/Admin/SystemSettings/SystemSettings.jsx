import { useState, useEffect } from 'react';
import { Settings, Save, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '../../../components/DashboardLayout';
import api from '../../../services/api';
import { useSettings } from '../../../contexts/SettingsContext';

const FIELD_CLASS = [
  'w-full px-4 py-2.5 text-sm rounded-xl transition-all duration-200',
  'bg-white dark:bg-slate-800/60',
  'border border-slate-200 dark:border-slate-700/60',
  'text-slate-800 dark:text-slate-200',
  'placeholder:text-slate-400 dark:placeholder:text-slate-500',
  'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400',
  'disabled:opacity-50 disabled:cursor-not-allowed',
].join(' ');

const LABEL_CLASS = 'block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5';

function FieldGroup({ label, hint, children }) {
  return (
    <div>
      <label className={LABEL_CLASS}>{label}</label>
      {children}
      {hint && (
        <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500 leading-relaxed">{hint}</p>
      )}
    </div>
  );
}

export default function SystemSettings() {
  const { refreshSettings } = useSettings();

  const [form, setForm]     = useState({ system_name: '', support_email: '', trial_duration_days: '' });
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    api.get('/public/settings')
      .then(({ data }) => {
        const s = data.settings ?? {};
        setForm({
          system_name:         s.system_name         ?? '',
          support_email:       s.support_email       ?? '',
          trial_duration_days: s.trial_duration_days ?? '30',
        });
      })
      .catch(() => toast.error('Erro ao carregar configurações.'))
      .finally(() => setLoading(false));
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const days = parseInt(form.trial_duration_days, 10);
    if (!form.system_name.trim()) {
      toast.error('O nome do sistema não pode ser vazio.');
      return;
    }
    if (isNaN(days) || days < 1 || days > 365) {
      toast.error('Dias de trial deve ser um número entre 1 e 365.');
      return;
    }

    setSaving(true);
    try {
      await api.put('/admin/settings', {
        settings: {
          system_name:         form.system_name.trim(),
          support_email:       form.support_email.trim(),
          trial_duration_days: String(days),
        },
      });
      toast.success('Configurações salvas com sucesso!');
      refreshSettings();
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <span className="inline-flex items-center text-xs font-mono font-bold px-2 py-0.5 rounded-md
                           bg-blue-500/10 text-blue-600 dark:text-blue-400
                           border border-blue-500/30 mb-3">
            ADMIN · CONFIGURAÇÕES
          </span>
          <div className="flex items-center gap-3">
            <Settings size={22} className="text-blue-500 shrink-0" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
              Configurações do Sistema
            </h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1.5">
            Parâmetros globais persistidos no banco de dados. Alterações refletem em toda a plataforma em tempo real.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="text-blue-500 animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSubmit}>

            {/* Card principal */}
            <div className="bg-white dark:bg-slate-900/60
                            border border-slate-200 dark:border-slate-800/60
                            rounded-2xl p-7 mb-4">

              <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-5 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                Identidade do Sistema
              </h2>

              <div className="flex flex-col gap-5">

                <FieldGroup
                  label="Nome do Sistema"
                  hint="Exibido na sidebar, título do navegador e no cabeçalho mobile. Muda em tempo real ao salvar."
                >
                  <input
                    type="text"
                    name="system_name"
                    value={form.system_name}
                    onChange={handleChange}
                    disabled={saving}
                    placeholder="ex: TISSflow"
                    maxLength={80}
                    className={FIELD_CLASS}
                  />
                </FieldGroup>

                <FieldGroup
                  label="E-mail de Suporte"
                  hint="Endereço exibido para os usuários em mensagens de ajuda e contato."
                >
                  <input
                    type="email"
                    name="support_email"
                    value={form.support_email}
                    onChange={handleChange}
                    disabled={saving}
                    placeholder="suporte@tissflow.com"
                    className={FIELD_CLASS}
                  />
                </FieldGroup>

              </div>
            </div>

            {/* Card trial */}
            <div className="bg-white dark:bg-slate-900/60
                            border border-slate-200 dark:border-slate-800/60
                            rounded-2xl p-7 mb-4">

              <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-5 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                Free Trial
              </h2>

              <FieldGroup
                label="Dias de Teste Gratuito"
                hint="Quantidade de dias que novos usuários têm de acesso no plano Free Trial. Lido do banco a cada novo cadastro."
              >
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    name="trial_duration_days"
                    value={form.trial_duration_days}
                    onChange={handleChange}
                    disabled={saving}
                    min={1}
                    max={365}
                    className={`${FIELD_CLASS} max-w-[140px]`}
                  />
                  <span className="text-sm text-slate-400 dark:text-slate-500">dias</span>
                </div>
              </FieldGroup>

              <div className="mt-4 flex items-start gap-2.5 px-3.5 py-3 rounded-xl
                              bg-amber-50 dark:bg-amber-500/10
                              border border-amber-200 dark:border-amber-500/30">
                <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                  Alterações aqui afetam apenas <strong>novos cadastros</strong>. Usuários já em trial não têm seu prazo recalculado.
                </p>
              </div>
            </div>

            {/* Botão salvar */}
            <button
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl
                         text-sm font-semibold text-white transition-all duration-200
                         bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed
                         shadow-sm hover:shadow-md hover:shadow-blue-500/20"
            >
              {saving ? (
                <><Loader2 size={16} className="animate-spin" /> Salvando…</>
              ) : (
                <><Save size={16} /> Salvar Configurações</>
              )}
            </button>

          </form>
        )}
      </div>
    </DashboardLayout>
  );
}
