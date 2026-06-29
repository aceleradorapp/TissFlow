import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Stethoscope } from 'lucide-react';
import { toast } from 'sonner';
import Button from '../../components/Button';
import Input from '../../components/Input';
import AuthLayout from '../../components/AuthLayout';
import api from '../../services/api';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useState(() => {
    if (location.state?.fromRegister) {
      toast.success('Conta criada com sucesso! Faça login para continuar.');
    }
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((e) => ({ ...e, [name]: '' }));
  }

  function validate() {
    const errs = {};
    if (!form.email) errs.email = 'E-mail é obrigatório.';
    if (!form.password) errs.password = 'Senha é obrigatória.';
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      localStorage.setItem('tissflow_token', data.token);
      localStorage.setItem('tissflow_user', JSON.stringify(data.user));
      toast.success(`Bem-vindo, ${data.user.name}!`);
      navigate(data.user.role === 'proprietario' ? '/admin/dashboard' : '/dashboard');
    } catch (err) {
      const msg = err.response?.data?.error ?? 'Erro ao conectar com o servidor.';
      if (err.response?.status === 401) {
        toast.error('Credenciais inválidas. Verifique e-mail e senha.');
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      {/* Logo */}
      <div className="flex flex-col items-center gap-2 mb-8">
        <Stethoscope className="text-blue-400" size={36} />
        <h1 className="text-2xl font-bold text-slate-50">TISSflow</h1>
        <p className="text-slate-400 text-sm">Entre na sua conta para continuar</p>
      </div>

      {/* Glassmorphic card */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl shadow-black/50">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Input
            label="E-mail"
            name="email"
            type="email"
            placeholder="seu@email.com"
            icon={Mail}
            value={form.email}
            onChange={handleChange}
            error={errors.email}
            autoComplete="email"
          />
          <Input
            label="Senha"
            name="password"
            type="password"
            placeholder="••••••••"
            icon={Lock}
            value={form.password}
            onChange={handleChange}
            error={errors.password}
            autoComplete="current-password"
          />

          <div className="flex justify-end">
            <Link
              to="/forgot-password"
              className="text-xs text-blue-400 hover:text-blue-300 hover:underline transition-colors"
            >
              Esqueci minha senha
            </Link>
          </div>

          <Button type="submit" variant="primary" isLoading={loading} className="w-full">
            Entrar
          </Button>
        </form>
      </div>

      <p className="text-center text-sm text-slate-400 mt-6">
        Não tem uma conta?{' '}
        <Link to="/register" className="text-blue-400 font-medium hover:text-blue-300 hover:underline transition-colors">
          Cadastre-se
        </Link>
      </p>
    </AuthLayout>
  );
}
