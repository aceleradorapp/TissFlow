import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Stethoscope } from 'lucide-react';
import { toast } from 'sonner';
import Button from '../../components/Button';
import Input from '../../components/Input';
import AuthLayout from '../../components/AuthLayout';
import api from '../../services/api';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((e) => ({ ...e, [name]: '' }));
  }

  function validate() {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Nome é obrigatório.';
    if (!form.email) errs.email = 'E-mail é obrigatório.';
    if (!form.password || form.password.length < 6)
      errs.password = 'Senha deve ter no mínimo 6 caracteres.';
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      await api.post('/auth/register', form);
      navigate('/login', { state: { fromRegister: true } });
    } catch (err) {
      const msg = err.response?.data?.error ?? 'Erro ao conectar com o servidor.';
      if (err.response?.status === 409) {
        setErrors({ email: 'Este e-mail já está cadastrado.' });
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
        <h1 className="text-2xl font-bold text-slate-50">Criar conta</h1>
        <p className="text-slate-400 text-sm">Preencha os dados para se cadastrar</p>
      </div>

      {/* Glassmorphic card */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl shadow-black/50">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Input
            label="Nome completo"
            name="name"
            type="text"
            placeholder="João Silva"
            icon={User}
            value={form.name}
            onChange={handleChange}
            error={errors.name}
            autoComplete="name"
          />
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
            placeholder="Mínimo 6 caracteres"
            icon={Lock}
            value={form.password}
            onChange={handleChange}
            error={errors.password}
            autoComplete="new-password"
          />

          <Button type="submit" variant="primary" isLoading={loading} className="w-full mt-1">
            Criar conta
          </Button>
        </form>
      </div>

      <p className="text-center text-sm text-slate-400 mt-6">
        Já tem uma conta?{' '}
        <Link to="/login" className="text-blue-400 font-medium hover:text-blue-300 hover:underline transition-colors">
          Fazer login
        </Link>
      </p>
    </AuthLayout>
  );
}
