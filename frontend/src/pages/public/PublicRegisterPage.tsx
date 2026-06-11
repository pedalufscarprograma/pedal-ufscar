import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { toast } from 'sonner';

import {
  Bike,
  Camera,
  Eye,
  EyeOff,
  User,
  UserPlus,
} from 'lucide-react';

import { api } from '../../api/api';

const racialIdentityOptions = [
  'Amarelo',
  'Branco',
  'Indígena',
  'Pardo',
  'Preto',
  'Prefiro não responder',
];

const genderIdentityOptions = [
  'Feminino',
  'Masculino',
  'Não Binário',
  'Prefiro não responder',
];

const socialClassOptions = [
  'Classe A: mais de 15 salários mínimos',
  'Classe B: de 5 a 15 salários mínimos',
  'Classe C: de 3 a 5 salários mínimos',
  'Classe D: de 1 a 3 salários mínimos',
  'Classe E: até 1 salário mínimo',
  'Prefiro não responder',
];

export default function PublicRegisterPage() {
  const [searchParams] = useSearchParams();

  const redirectTo =
    searchParams.get('redirect') || '/public/dashboard';

  const loginUrl = `/public/login?redirect=${encodeURIComponent(redirectTo)}`;

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const [cpf, setCpf] = useState('');
  const [rg, setRg] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [birthPlace, setBirthPlace] = useState('');
  const [nationality, setNationality] = useState('');

  const [ufscarNumber, setUfscarNumber] = useState('');
  const [courseOrDepartment, setCourseOrDepartment] = useState('');
  const [address, setAddress] = useState('');

  const [racialIdentity, setRacialIdentity] = useState('');
  const [genderIdentity, setGenderIdentity] = useState('');
  const [socialClass, setSocialClass] = useState('');

  const [userType, setUserType] = useState('student');

  const [photoUrl, setPhotoUrl] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  function handlePhotoSelected(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.warning('Selecione apenas arquivo de imagem.');
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const image = new Image();

      image.onload = () => {
        const canvas = document.createElement('canvas');

        const maxSize = 400;
        let { width, height } = image;

        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else if (height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }

        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext('2d');

        if (!context) {
          toast.error('Erro ao processar imagem.');
          return;
        }

        context.drawImage(image, 0, 0, width, height);

        const compressedImage = canvas.toDataURL('image/jpeg', 0.7);

        setPhotoUrl(compressedImage);
        setPhotoPreview(compressedImage);
      };

      image.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  }

  async function handleRegister(event: React.FormEvent) {
    event.preventDefault();

    if (password.length < 6) {
      toast.warning('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      toast.warning('As senhas não coincidem.');
      return;
    }

    try {
      setLoading(true);

      await api.post('/auth/register', {
        fullName,
        email,
        phone,
        cpf,
        rg: rg || undefined,
        birthDate,
        birthPlace,
        nationality,
        ufscarNumber,
        courseOrDepartment,
        address,
        racialIdentity,
        genderIdentity,
        socialClass,
        userType,
        password,
        photoUrl,
      });

      setRegistered(true);

      toast.success('Cadastro enviado com sucesso!');
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          'Erro ao realizar cadastro.',
      );
    } finally {
      setLoading(false);
    }
  }

  if (registered) {
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-md rounded-3xl bg-white p-6 text-center shadow-lg shadow-slate-200/60">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-green-600 text-white">
            <UserPlus size={32} />
          </div>

          <h1 className="mt-5 text-2xl font-black text-slate-900">
            Cadastro enviado!
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-slate-500">
            Seu cadastro foi recebido e está aguardando aprovação da equipe responsável.
            Após aprovação, você poderá acessar o sistema e solicitar bicicletas.
          </p>

          <a
            href={loginUrl}
            className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-5 py-3 font-black text-white shadow-lg shadow-blue-950/20 transition hover:bg-blue-700"
          >
            Ir para login
          </a>
        </div>
      </div>
    );
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
            Cadastre-se para solicitar empréstimo de bicicletas.
          </p>
        </div>

        <form
          onSubmit={handleRegister}
          className="rounded-3xl bg-white p-6 shadow-lg shadow-slate-200/60"
        >
          <div className="grid gap-4">
            <div className="flex flex-col items-center gap-3">
              <div className="h-28 w-28 overflow-hidden rounded-full border-4 border-slate-200 bg-slate-100">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Foto de perfil"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-400">
                    <User size={40} />
                  </div>
                )}
              </div>

              <label className="cursor-pointer rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-700">
                
                <div className="flex items-center gap-2">
                  <Camera size={16} />
                  Escolher foto
                </div>

                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelected}
                  className="hidden"
                />
              </label>
            </div>

            <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nome completo *" required className="h-12 rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />

            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail *" required className="h-12 rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />

            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefone *" required className="h-12 rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />

            <input value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="CPF *" required className="h-12 rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />

            <input value={rg} onChange={(e) => setRg(e.target.value)} placeholder="RG" className="h-12 rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />

            <label className="flex flex-col gap-2">
              <span className="text-sm font-bold text-slate-600">
                Data de nascimento *
              </span>

              <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} required className="h-12 rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
            </label>

            <input value={birthPlace} onChange={(e) => setBirthPlace(e.target.value)} placeholder="Naturalidade (Cidade/País) *" required className="h-12 rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />

            <input value={nationality} onChange={(e) => setNationality(e.target.value)} placeholder="Nacionalidade *" required className="h-12 rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />

            <select value={userType} onChange={(e) => setUserType(e.target.value)} required className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
              <option value="student">Discente</option>
              <option value="teacher">Docente</option>
              <option value="staff">Servidor</option>
              <option value="outsourced_worker">Terceirizado</option>
            </select>

            <input value={ufscarNumber} onChange={(e) => setUfscarNumber(e.target.value)} placeholder="RA / Matrícula / Nº UFSCar *" required className="h-12 rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />

            <input value={courseOrDepartment} onChange={(e) => setCourseOrDepartment(e.target.value)} placeholder="Curso ou departamento *" required className="h-12 rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />

            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Endereço / Moradia / Campus *" required className="h-12 rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />

            <select value={racialIdentity} onChange={(e) => setRacialIdentity(e.target.value)} required className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
              <option value="">Auto identificação racial *</option>
              {racialIdentityOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>

            <select value={genderIdentity} onChange={(e) => setGenderIdentity(e.target.value)} required className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
              <option value="">Auto identificação de gênero *</option>
              {genderIdentityOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>

            <select value={socialClass} onChange={(e) => setSocialClass(e.target.value)} required className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
              <option value="">Classe social *</option>
              {socialClassOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>

            <p className="text-xs font-semibold text-slate-500">
              OBS: Considera o salário mínimo 2026 = R$ 1.621,00.
            </p>

            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha *" required className="h-12 w-full rounded-xl border border-slate-200 px-4 pr-12 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />

              <button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>

            <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirmar senha *" required className="h-12 rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
          </div>

          <button type="submit" disabled={loading} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-black text-white shadow-lg shadow-indigo-950/20 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">
            <UserPlus size={18} />
            {loading ? 'Enviando...' : 'Criar cadastro'}
          </button>

          <p className="mt-5 text-center text-sm text-slate-500">
            Já tem cadastro?{' '}
            <a href={loginUrl} className="font-bold text-blue-600 hover:text-blue-700">
              Entrar
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}