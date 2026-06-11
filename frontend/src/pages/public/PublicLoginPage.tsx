import { useState } from 'react';
import {
  useNavigate,
  useSearchParams,
} from 'react-router-dom';

import { toast } from 'sonner';

import {
  Bike,
  Eye,
  EyeOff,
  LogIn,
} from 'lucide-react';

import { api } from '../../api/api';

export default function PublicLoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const redirectTo =
    searchParams.get('redirect') || '/public/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();

    try {
      setLoading(true);

      const response = await api.post('/auth/login', {
        email,
        password,
      });

      const loggedUser = response.data.user;

      localStorage.setItem('public_access_token', response.data.accessToken);
      localStorage.setItem('public_user', JSON.stringify(loggedUser));

      toast.success('Login realizado com sucesso!');

      const internalUserTypes = ['admin', 'operator', 'mechanic'];

      if (internalUserTypes.includes(loggedUser.userType)) {
        localStorage.setItem('@pedal_token', response.data.accessToken);
        localStorage.setItem('@pedal_user', JSON.stringify(loggedUser));

        navigate('/dashboard');
        return;
      }

      navigate('/public/dashboard');
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          'Erro ao fazer login.',
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
            PEDAL-UFSCar
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Entre para consultar bicicletas disponíveis e acompanhar suas solicitações.
          </p>
        </div>

        <form
          onSubmit={handleLogin}
          className="rounded-3xl bg-white p-6 shadow-lg shadow-slate-200/60"
        >
          <div className="grid gap-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-mail"
              required
              className="h-12 rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Senha"
                required
                className="h-12 w-full rounded-xl border border-slate-200 px-4 pr-12 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />

              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              >
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-black text-white shadow-lg shadow-indigo-950/20 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogIn size={18} />
            {loading ? 'Entrando...' : 'Entrar'}
          </button>

          <p className="mt-5 text-center text-sm text-slate-500">
            Ainda não tem cadastro?{' '}
            
            <a
              href={`/public/register?redirect=${encodeURIComponent(redirectTo)}`}
              className="font-bold text-blue-600 hover:text-blue-700"
            > 
              Criar conta
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}