import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Stethoscope, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import Button from '../../components/Button';
import Input from '../../components/Input';
import AuthLayout from '../../components/AuthLayout';
import api from '../../services/api';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [form, setForm] = useState({ newPassword: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((e) => ({ ...e, [name]: '' }));
  }

  function validate() {
    const errs = {};
    if (!form.newPassword || form.newPassword.length < 6)
      errs.newPassword = 'A senha deve ter no mínimo 6 caracteres.';
    if (form.newPassword !== form.confirm)
      errs.confirm = 'As senhas não coincidem.';
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!token) { toast.error('Token inválido ou ausente na URL.'); return; }
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword: form.newPassword });
      toast.success('Senha redefinida com sucesso!');
      navigate('/login');
    } catch (err) {
      const msg = err.response?.data?.error ?? 'Erro ao conectar com o servidor.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      {/* Logo */}
      <div className="flex flex-col items-center gap-2 mb-8">
        <Stethoscope className="text-blue-400" size={36} />
        <h1 className="text-2xl font-bold text-slate-50">Nova senha</h1>
        <p className="text-slate-400 text-sm">Escolha uma senha forte para sua conta</p>
      </div>

      {/* Glassmorphic card */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl shadow-black/50">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Input
            label="Nova senha"
            name="newPassword"
            type="password"
            placeholder="Mínimo 6 caracteres"
            icon={Lock}
            value={form.newPassword}
            onChange={handleChange}
            error={errors.newPassword}
            autoComplete="new-password"
          />
          <Input
            label="Confirmar nova senha"
            name="confirm"
            type="password"
            placeholder="Repita a nova senha"
            icon={Lock}
            value={form.confirm}
            onChange={handleChange}
            error={errors.confirm}
            autoComplete="new-password"
          />
          <Button type="submit" variant="primary" isLoading={loading} className="w-full mt-1">
            Redefinir senha
          </Button>
        </form>
      </div>

      <Link
        to="/login"
        className="flex items-center justify-center gap-1.5 mt-6 text-sm
                   text-slate-400 hover:text-blue-400 transition-colors duration-200"
      >
        <ArrowLeft size={14} /> Voltar para o login
      </Link>
    </AuthLayout>
  );
}
