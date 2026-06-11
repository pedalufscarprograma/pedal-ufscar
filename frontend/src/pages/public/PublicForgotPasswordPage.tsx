import { useState } from 'react';
import { Link } from 'react-router-dom';

import { toast } from 'sonner';

import {
  Bike,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  ShieldCheck,
} from 'lucide-react';

import { api } from '../../api/api';

export default function PublicForgotPasswordPage() {
  const [step, setStep] = useState(1);

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');

  const [generatedCode, setGeneratedCode] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSendCode(event: React.FormEvent) {
    event.preventDefault();

    if (!email.trim()) {
      toast.warning('Informe seu e-mail.');
      return;
    }

    try {
      setLoading(true);

      const response = await api.post('/auth/forgot-password', {
        email,
      });

      if (response.data?.code) {
        setGeneratedCode(response.data.code);
      }

      toast.success(
        response.data?.message ||
          'Código enviado. Verifique seu e-mail.',
      );

      setStep(2);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          'Erro ao solicitar recuperação de senha.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(event: React.FormEvent) {
    event.preventDefault();

    if (!code.trim()) {
      toast.warning('Informe o código recebido.');
      return;
    }

    if (newPassword.length < 6) {
      toast.warning('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.warning('As senhas não coincidem.');
      return;
    }

    try {
      setLoading(true);

      const response = await api.post('/auth/reset-password', {
        email,
        code,
        newPassword,
      });

      toast.success(
        response.data?.message ||
          'Senha redefinida com sucesso.',
      );

      setStep(3);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          'Erro ao redefinir senha.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-indigo-600 text-white shadow-lg shadow-indigo-950/20">
            <Bike size={34} />
          </div>

          <h1 className="mt-4 text-3xl font-black text-slate-900">
            Recuperar senha
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Informe seu e-mail para gerar um código de recuperação.
          </p>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-lg shadow-slate-200/60">
          {step === 1 && (
            <form onSubmit={handleSendCode}>
              <div className="mb-5 flex items-center gap-3 rounded-2xl bg-blue-50 p-4 text-blue-800">
                <Mail size={22} />

                <p className="text-sm font-semibold">
                  Digite o e-mail usado no cadastro.
                </p>
              </div>

              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Seu e-mail"
                required
                className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />

              <button
                type="submit"
                disabled={loading}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-black text-white shadow-lg shadow-indigo-950/20 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <KeyRound size={18} />
                {loading ? 'Enviando...' : 'Gerar código'}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleResetPassword}>
              <div className="mb-5 rounded-2xl bg-amber-50 p-4 text-amber-900">
                <p className="text-sm font-semibold">
                  Informe o código de 6 dígitos e cadastre uma nova senha.
                </p>

                {generatedCode && (
                  <p className="mt-3 rounded-xl bg-white px-4 py-3 text-center text-2xl font-black tracking-widest text-amber-700">
                    {generatedCode}
                  </p>
                )}

                {generatedCode && (
                  <p className="mt-2 text-xs font-semibold text-amber-700">
                    Em produção real este código deve ser enviado por e-mail.
                  </p>
                )}
              </div>

              <input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="Código de recuperação"
                maxLength={6}
                required
                className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />

              <div className="relative mt-4">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(event) =>
                    setNewPassword(event.target.value)
                  }
                  placeholder="Nova senha"
                  required
                  className="h-12 w-full rounded-xl border border-slate-200 px-4 pr-12 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword((current) => !current)
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showPassword ? (
                    <EyeOff size={19} />
                  ) : (
                    <Eye size={19} />
                  )}
                </button>
              </div>

              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                placeholder="Confirmar nova senha"
                required
                className="mt-4 h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />

              <button
                type="submit"
                disabled={loading}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3 font-black text-white shadow-lg shadow-green-950/20 transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ShieldCheck size={18} />
                {loading ? 'Salvando...' : 'Redefinir senha'}
              </button>
            </form>
          )}

          {step === 3 && (
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-green-600 text-white">
                <ShieldCheck size={32} />
              </div>

              <h2 className="mt-5 text-2xl font-black text-slate-900">
                Senha redefinida!
              </h2>

              <p className="mt-3 text-sm leading-relaxed text-slate-500">
                Agora você pode entrar no sistema usando sua nova senha.
              </p>

              <Link
                to="/public/login"
                className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 font-black text-white shadow-lg shadow-indigo-950/20 transition hover:bg-indigo-700"
              >
                Ir para login
              </Link>
            </div>
          )}

          {step !== 3 && (
            <p className="mt-5 text-center text-sm text-slate-500">
              Lembrou sua senha?{' '}
              <Link
                to="/public/login"
                className="font-bold text-blue-600 hover:text-blue-700"
              >
                Entrar
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}