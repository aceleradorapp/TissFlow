import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench, Package } from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '../../components/DashboardLayout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import api from '../../services/api';

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/auth/profile')
      .then(({ data }) => setUser(data.user))
      .catch((err) => {
        if (err.response?.status === 401) {
          localStorage.removeItem('tissflow_token');
          localStorage.removeItem('tissflow_user');
          navigate('/login');
        } else {
          toast.error('Erro ao carregar seus dados.');
        }
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  const tools = user?.plan?.tools ?? [];
  const firstName = user?.name?.split(' ')[0] ?? '';

  const TOOL_ROUTES = {
    'swagger-visual': '/tools/swagger',
    'xml-generator':  '/tools/generator',
  };

  return (
    <DashboardLayout>
      {loading ? (
        <div className="flex items-center justify-center h-full">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="max-w-5xl mx-auto">

          {/* Cabeçalho da página */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
              Olá, {firstName}!
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
              {user?.plan
                ? <>Seu plano: <span className="font-semibold text-blue-600 dark:text-blue-400">{user.plan.name}</span></>
                : 'Você ainda não possui um plano ativo.'}
            </p>
          </div>

          {/* Sem plano */}
          {!user?.plan && (
            <Card className="flex flex-col items-center gap-5 py-14 text-center">
              <Package className="text-slate-300 dark:text-slate-600" size={52} />
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                  Nenhum plano ativo
                </h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1.5 text-sm max-w-xs mx-auto">
                  Assine um dos nossos planos para ter acesso às ferramentas TISS e começar a usar a plataforma.
                </p>
              </div>
              <Button variant="primary">Ver planos disponíveis</Button>
            </Card>
          )}

          {/* Plano sem ferramentas */}
          {user?.plan && tools.length === 0 && (
            <Card className="flex flex-col items-center gap-5 py-14 text-center">
              <Wrench className="text-slate-300 dark:text-slate-600" size={52} />
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                  Nenhuma ferramenta disponível
                </h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1.5 text-sm max-w-xs mx-auto">
                  Seu plano <span className="font-semibold">{user.plan.name}</span> ainda não possui
                  ferramentas vinculadas. Entre em contato com o suporte.
                </p>
              </div>
            </Card>
          )}

          {/* Grid de ferramentas */}
          {tools.length > 0 && (
            <>
              <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400
                             uppercase tracking-wider mb-4">
                Ferramentas disponíveis · {tools.length}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {tools.map((tool) => (
                  <Card key={tool.id} className="flex flex-col gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg shrink-0">
                        <Wrench className="text-blue-600 dark:text-blue-400" size={18} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-slate-900 dark:text-slate-50 text-sm leading-snug">
                          {tool.name}
                        </h3>
                        {tool.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                            {tool.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="primary"
                      className="w-full mt-auto"
                      onClick={() => navigate(TOOL_ROUTES[tool.slug] ?? '/dashboard')}
                    >
                      Acessar
                    </Button>
                  </Card>
                ))}
              </div>
            </>
          )}

        </div>
      )}
    </DashboardLayout>
  );
}
