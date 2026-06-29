import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Stethoscope, ArrowLeft, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import Button from '../../components/Button';
import Input from '../../components/Input';
import AuthLayout from '../../components/AuthLayout';
import api from '../../services/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email) { setError('E-mail é obrigatório.'); return; }

    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch {
      toast.error('Erro ao conectar com o servidor. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      {/* Logo */}
      <div className="flex flex-col items-center gap-2 mb-8">
        <Stethoscope className="text-blue-400" size={36} />
        <h1 className="text-2xl font-bold text-slate-50">Recuperar senha</h1>
        <p className="text-slate-400 text-sm text-center">
          Informe seu e-mail e enviaremos as instruções de recuperação
        </p>
      </div>

      {/* Glassmorphic card */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl shadow-black/50">
        {sent ? (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <CheckCircle className="text-emerald-400" size={44} />
            <p className="text-slate-200 font-medium">
              Se o e-mail estiver cadastrado, as instruções foram enviadas.
            </p>
            <p className="text-slate-400 text-sm">
              Verifique também sua caixa de spam.
              <br />
              <span className="text-xs italic text-slate-500">
                (Em desenvolvimento: veja o link no terminal do backend)
              </span>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <Input
              label="E-mail"
              name="email"
              type="email"
              placeholder="seu@email.com"
              icon={Mail}
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              error={error}
              autoComplete="email"
            />
            <Button type="submit" variant="primary" isLoading={loading} className="w-full">
              Enviar instruções
            </Button>
          </form>
        )}
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
