import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import {
  Ban,
  CheckCircle2,
  Download,
  Eye,
  ImageIcon,
  PauseCircle,
  RefreshCw,
  Search,
  ShieldX,
  UserPlus,
  Users,
  X,
} from 'lucide-react';

import { api } from '../api/api';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { exportToCsv } from '../utils/exportCsv';

interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  cpf: string | null;
  rg: string | null;
  birthDate: string | null;

  birthPlace: string | null;
  nationality: string | null;

  ufscarNumber: string | null;
  courseOrDepartment: string | null;
  address: string | null;

  userType: string;
  status: string;

  racialIdentity: string | null;
  genderIdentity: string | null;
  socialClass: string | null;

  photoUrl: string | null;
  createdAt: string;
}

type UserAction = 'approve' | 'suspend' | 'block' | 'cancel';

interface CreateInternalUserForm {
  fullName: string;
  email: string;
  phone: string;
  cpf: string;
  rg: string;
  password: string;
  userType: 'admin' | 'operator' | 'mechanic';
}

const initialInternalUserForm: CreateInternalUserForm = {
  fullName: '',
  email: '',
  phone: '',
  cpf: '',
  rg: '',
  password: '',
  userType: 'operator',
};

interface SelectedAction {
  user: User;
  action: UserAction;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [selectedAction, setSelectedAction] =
    useState<SelectedAction | null>(null);

  const [selectedDetailsUser, setSelectedDetailsUser] =
    useState<User | null>(null);

  const [selectedPhotoUrl, setSelectedPhotoUrl] =
    useState<string | null>(null);

  const [showCreateInternalUserModal, setShowCreateInternalUserModal] =
    useState(false);

  const [creatingInternalUser, setCreatingInternalUser] = useState(false);

  const [internalUserForm, setInternalUserForm] =
    useState<CreateInternalUserForm>(initialInternalUserForm);

  async function loadUsers() {
    try {
      setLoading(true);
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          'Erro ao carregar usuários.',
      );
    } finally {
      setLoading(false);
    }
  }

  function openActionModal(user: User, action: UserAction) {
    setSelectedAction({
      user,
      action,
    });
  }

  function closeActionModal() {
    setSelectedAction(null);
  }

  function openCreateInternalUserModal() {
    setInternalUserForm(initialInternalUserForm);
    setShowCreateInternalUserModal(true);
  }

  function closeCreateInternalUserModal() {
    if (creatingInternalUser) return;

    setShowCreateInternalUserModal(false);
    setInternalUserForm(initialInternalUserForm);
  }

  function updateInternalUserForm<K extends keyof CreateInternalUserForm>(
    field: K,
    value: CreateInternalUserForm[K],
  ) {
    setInternalUserForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  async function handleCreateInternalUser() {
    if (!internalUserForm.fullName.trim()) {
      toast.error('Informe o nome completo.');
      return;
    }

    if (!internalUserForm.email.trim()) {
      toast.error('Informe o e-mail.');
      return;
    }

    if (!internalUserForm.password.trim()) {
      toast.error('Informe uma senha provisória.');
      return;
    }

    try {
      setCreatingInternalUser(true);

      await api.post('/users/internal', {
        fullName: internalUserForm.fullName.trim(),
        email: internalUserForm.email.trim(),
        phone: internalUserForm.phone.trim() || null,
        cpf: internalUserForm.cpf.trim() || null,
        rg: internalUserForm.rg.trim() || null,
        password: internalUserForm.password,
        userType: internalUserForm.userType,
      });

      toast.success('Usuário interno criado com sucesso!');
      closeCreateInternalUserModal();
      await loadUsers();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          'Erro ao criar usuário interno.',
      );
    } finally {
      setCreatingInternalUser(false);
    }
  }

  async function confirmUserAction() {
    if (!selectedAction) return;

    const { user, action } = selectedAction;

    const endpointMap: Record<UserAction, string> = {
      approve: `/users/${user.id}/approve`,
      suspend: `/users/${user.id}/suspend`,
      block: `/users/${user.id}/block`,
      cancel: `/users/${user.id}/cancel`,
    };

    const successMap: Record<UserAction, string> = {
      approve: 'Usuário aprovado com sucesso!',
      suspend: 'Usuário suspenso com sucesso!',
      block: 'Usuário bloqueado com sucesso!',
      cancel: 'Usuário cancelado com sucesso!',
    };

    try {
      await api.patch(endpointMap[action]);
      await loadUsers();
      closeActionModal();
      setSelectedDetailsUser(null);
      toast.success(successMap[action]);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          'Erro ao atualizar usuário.',
      );
    }
  }

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const searchText = `
        ${user.fullName}
        ${user.email}
        ${user.phone || ''}
        ${user.cpf || ''}
        ${user.rg || ''}
        ${user.ufscarNumber || ''}
        ${user.courseOrDepartment || ''}
        ${user.userType}
      `.toLowerCase();

      const matchesSearch = searchText.includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' || user.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [users, search, statusFilter]);

  function handleExportUsers() {
    exportToCsv(
      'usuarios-pedal-ufscar.csv',
      filteredUsers.map((user) => ({
        Nome: user.fullName,
        Email: user.email,
        Telefone: user.phone || '',
        CPF: user.cpf || '',
        RG: user.rg || '',

        Naturalidade: user.birthPlace || '',
        Nacionalidade: user.nationality || '',

        RacaCor: user.racialIdentity || '',
        Genero: user.genderIdentity || '',
        ClasseSocial: user.socialClass || '',

        Tipo: translateUserType(user.userType),
        Status: translateStatus(user.status),
      })),
    );
  }

  useEffect(() => {
    loadUsers();
  }, []);

  return (
    <DashboardLayout>
      <div>
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-950/20">
              <Users size={24} />
            </div>

            <div>
              <h1 className="text-3xl font-black text-slate-900">
                Usuários
              </h1>

              <p className="mt-1 text-slate-500">
                Visualize dados completos, fotos de perfil e aprove cadastros.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={openCreateInternalUserModal}
              className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3 font-bold text-white shadow-lg shadow-green-950/20 transition hover:bg-green-700"
            >
              <UserPlus size={18} />
              Criar usuário interno
            </button>

            <button
              onClick={handleExportUsers}
              className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 font-bold text-white shadow-lg shadow-slate-950/20 transition hover:bg-slate-800"
            >
              <Download size={18} />
              Exportar CSV
            </button>

            <button
              onClick={loadUsers}
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white shadow-lg shadow-blue-950/20 transition hover:bg-blue-700"
            >
              <RefreshCw size={18} />
              Atualizar
            </button>
          </div>
        </div>

        <div className="mb-6 grid gap-4 rounded-3xl bg-white p-5 shadow-lg shadow-slate-200/60 lg:grid-cols-3">
          <div className="relative lg:col-span-2">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, e-mail, telefone, CPF, RG ou matrícula..."
              className="h-12 w-full rounded-xl border border-slate-200 pl-11 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          >
            <option value="all">Todos os status</option>
            <option value="pending">Pendentes</option>
            <option value="approved">Aprovados</option>
            <option value="suspended">Suspensos</option>
            <option value="blocked">Bloqueados</option>
            <option value="cancelled">Cancelados</option>
          </select>
        </div>

        <div className="overflow-hidden rounded-3xl bg-white shadow-lg shadow-slate-200/60">
          {loading ? (
            <div className="p-8 text-center font-semibold text-slate-500">
              Carregando usuários...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center font-semibold text-slate-500">
              Nenhum usuário encontrado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                      Foto
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                      Nome
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                      E-mail
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                      Telefone
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                      Tipo
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                      Ações
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="transition hover:bg-slate-50">
                      <td className="px-6 py-5">
                        {user.photoUrl ? (
                          <button
                            onClick={() => setSelectedPhotoUrl(user.photoUrl)}
                            className="block"
                          >
                            <img
                              src={user.photoUrl}
                              alt={user.fullName}
                              className="h-14 w-14 rounded-2xl object-cover ring-2 ring-slate-100 transition hover:scale-105"
                            />
                          </button>
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                            <ImageIcon size={22} />
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-5">
                        <p className="font-bold text-slate-900">
                          {user.fullName}
                        </p>

                        <p className="text-xs text-slate-400">
                          Cadastrado em {formatDate(user.createdAt)}
                        </p>
                      </td>

                      <td className="px-6 py-5 text-sm text-slate-600">
                        {user.email}
                      </td>

                      <td className="px-6 py-5 text-sm text-slate-600">
                        {user.phone || 'Não informado'}
                      </td>

                      <td className="px-6 py-5">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                          {translateUserType(user.userType)}
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        <StatusBadge status={user.status} />
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => setSelectedDetailsUser(user)}
                            className="flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-700"
                          >
                            <Eye size={15} />
                            Ver dados
                          </button>

                          {user.status !== 'approved' && (
                            <button
                              onClick={() => openActionModal(user, 'approve')}
                              className="flex items-center gap-2 rounded-xl bg-green-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-green-700"
                            >
                              <CheckCircle2 size={15} />
                              Aprovar
                            </button>
                          )}

                          {user.status === 'approved' && (
                            <button
                              onClick={() => openActionModal(user, 'suspend')}
                              className="flex items-center gap-2 rounded-xl bg-orange-500 px-3 py-2 text-xs font-bold text-white transition hover:bg-orange-600"
                            >
                              <PauseCircle size={15} />
                              Suspender
                            </button>
                          )}

                          {user.status !== 'blocked' &&
                            user.status !== 'cancelled' && (
                              <button
                                onClick={() => openActionModal(user, 'block')}
                                className="flex items-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-red-700"
                              >
                                <Ban size={15} />
                                Bloquear
                              </button>
                            )}

                          {user.status !== 'cancelled' && (
                            <button
                              onClick={() => openActionModal(user, 'cancel')}
                              className="flex items-center gap-2 rounded-xl bg-slate-700 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
                            >
                              <ShieldX size={15} />
                              Cancelar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showCreateInternalUserModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
            <div className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-2xl">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">
                    Criar usuário interno
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Cadastre administradores, operadores ou mecânicos do sistema.
                  </p>
                </div>

                <button
                  onClick={closeCreateInternalUserModal}
                  disabled={creatingInternalUser}
                  className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <X size={22} />
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  label="Nome completo"
                  value={internalUserForm.fullName}
                  onChange={(value) => updateInternalUserForm('fullName', value)}
                  placeholder="Ex: Maria Silva"
                />

                <FormField
                  label="E-mail"
                  value={internalUserForm.email}
                  onChange={(value) => updateInternalUserForm('email', value)}
                  placeholder="usuario@ufscar.br"
                  type="email"
                />

                <FormField
                  label="Telefone"
                  value={internalUserForm.phone}
                  onChange={(value) => updateInternalUserForm('phone', value)}
                  placeholder="(16) 99999-9999"
                />

                <FormField
                  label="CPF"
                  value={internalUserForm.cpf}
                  onChange={(value) => updateInternalUserForm('cpf', value)}
                  placeholder="000.000.000-00"
                />

                <FormField
                  label="RG"
                  value={internalUserForm.rg}
                  onChange={(value) => updateInternalUserForm('rg', value)}
                  placeholder="00.000.000-0"
                />

                <FormField
                  label="Senha provisória"
                  value={internalUserForm.password}
                  onChange={(value) => updateInternalUserForm('password', value)}
                  placeholder="Digite uma senha provisória"
                  type="password"
                />

                <div className="md:col-span-2">
                  <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
                    Tipo de usuário interno
                  </label>

                  <select
                    value={internalUserForm.userType}
                    onChange={(e) =>
                      updateInternalUserForm(
                        'userType',
                        e.target.value as CreateInternalUserForm['userType'],
                      )
                    }
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  >
                    <option value="operator">Operador</option>
                    <option value="mechanic">Mecânico</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={closeCreateInternalUserModal}
                  disabled={creatingInternalUser}
                  className="rounded-xl bg-slate-100 px-5 py-3 font-bold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Fechar
                </button>

                <button
                  onClick={handleCreateInternalUser}
                  disabled={creatingInternalUser}
                  className="flex items-center gap-2 rounded-xl bg-green-600 px-5 py-3 font-black text-white shadow-lg shadow-green-950/20 transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <UserPlus size={18} />
                  {creatingInternalUser ? 'Criando...' : 'Criar usuário'}
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedDetailsUser && (
          <UserDetailsModal
            user={selectedDetailsUser}
            onClose={() => setSelectedDetailsUser(null)}
            onPhotoClick={(photoUrl) => setSelectedPhotoUrl(photoUrl)}
            onAction={openActionModal}
          />
        )}

        {selectedAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
            <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">
                    {getActionTitle(selectedAction.action)}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {getActionDescription(selectedAction.action)}
                  </p>
                </div>

                <button
                  onClick={closeActionModal}
                  className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  <X size={22} />
                </button>
              </div>

              <div className="mb-6 rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Nome</p>
                <p className="font-bold text-slate-900">
                  {selectedAction.user.fullName}
                </p>

                <p className="mt-3 text-sm text-slate-500">E-mail</p>
                <p className="font-bold text-slate-900">
                  {selectedAction.user.email}
                </p>

                <p className="mt-3 text-sm text-slate-500">Tipo</p>
                <p className="font-bold text-slate-900">
                  {translateUserType(selectedAction.user.userType)}
                </p>

                <p className="mt-3 text-sm text-slate-500">Status atual</p>
                <div className="mt-1">
                  <StatusBadge status={selectedAction.user.status} />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={closeActionModal}
                  className="rounded-xl bg-slate-100 px-5 py-3 font-bold text-slate-700 transition hover:bg-slate-200"
                >
                  Fechar
                </button>

                <button
                  onClick={confirmUserAction}
                  className={`${getActionButtonClass(
                    selectedAction.action,
                  )} rounded-xl px-5 py-3 font-black text-white shadow-lg transition`}
                >
                  {getActionConfirmText(selectedAction.action)}
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedPhotoUrl && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 p-4">
            <div className="relative max-h-[90vh] max-w-4xl">
              <button
                onClick={() => setSelectedPhotoUrl(null)}
                className="absolute -right-3 -top-3 rounded-full bg-white p-2 text-slate-700 shadow-lg transition hover:bg-slate-100"
              >
                <X size={22} />
              </button>

              <img
                src={selectedPhotoUrl}
                alt="Foto ampliada"
                className="max-h-[90vh] max-w-full rounded-3xl object-contain shadow-2xl"
              />
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function UserDetailsModal({
  user,
  onClose,
  onPhotoClick,
  onAction,
}: {
  user: User;
  onClose: () => void;
  onPhotoClick: (photoUrl: string) => void;
  onAction: (user: User, action: UserAction) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900">
              Dados completos do cadastro
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Revise as informações antes de aprovar ou alterar o status.
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={22} />
          </button>
        </div>

        <div className="mb-6 flex flex-col gap-5 rounded-3xl bg-slate-50 p-5 md:flex-row md:items-center">
          {user.photoUrl ? (
            <button onClick={() => onPhotoClick(user.photoUrl!)}>
              <img
                src={user.photoUrl}
                alt={user.fullName}
                className="h-32 w-32 rounded-3xl object-cover ring-4 ring-white shadow-lg transition hover:scale-105"
              />
            </button>
          ) : (
            <div className="flex h-32 w-32 items-center justify-center rounded-3xl bg-white text-slate-400 shadow">
              <ImageIcon size={38} />
            </div>
          )}

          <div>
            <h3 className="text-2xl font-black text-slate-900">
              {user.fullName}
            </h3>

            <p className="mt-1 text-sm font-semibold text-slate-500">
              {user.email}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge status={user.status} />

              <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-black text-slate-700">
                {translateUserType(user.userType)}
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <InfoItem label="Nome completo" value={user.fullName} />
          <InfoItem label="E-mail" value={user.email} />
          <InfoItem label="Telefone" value={user.phone} />
          <InfoItem label="CPF" value={user.cpf} />
          <InfoItem label="RG" value={user.rg} />
          <InfoItem
            label="Data de nascimento"
            value={user.birthDate ? formatDate(user.birthDate) : null}
          />

          <InfoItem
            label="Naturalidade (Cidade / País)"
            value={user.birthPlace}
          />

          <InfoItem
            label="Nacionalidade"
            value={user.nationality}
          />

          <InfoItem
            label="Nº UFSCar / RA / Matrícula"
            value={user.ufscarNumber}
          />
          <InfoItem label="Curso / Departamento" value={user.courseOrDepartment} />
          <InfoItem label="Endereço / Moradia / Campus" value={user.address} />
          <InfoItem label="Identidade racial" value={user.racialIdentity} />
          <InfoItem label="Identidade de gênero" value={user.genderIdentity} />
          <InfoItem label="Classe social" value={user.socialClass} />
          <InfoItem label="Data de cadastro" value={formatDate(user.createdAt)} />
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          {user.status !== 'approved' && (
            <button
              onClick={() => onAction(user, 'approve')}
              className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-black text-white transition hover:bg-green-700"
            >
              <CheckCircle2 size={17} />
              Aprovar
            </button>
          )}

          {user.status === 'approved' && (
            <button
              onClick={() => onAction(user, 'suspend')}
              className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-black text-white transition hover:bg-orange-600"
            >
              <PauseCircle size={17} />
              Suspender
            </button>
          )}

          {user.status !== 'blocked' && user.status !== 'cancelled' && (
            <button
              onClick={() => onAction(user, 'block')}
              className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-black text-white transition hover:bg-red-700"
            >
              <Ban size={17} />
              Bloquear
            </button>
          )}

          {user.status !== 'cancelled' && (
            <button
              onClick={() => onAction(user, 'cancel')}
              className="flex items-center gap-2 rounded-xl bg-slate-700 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800"
            >
              <ShieldX size={17} />
              Cancelar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </label>

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type={type}
        className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
      />
    </div>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-sm font-bold text-slate-800">
        {value || 'Não informado'}
      </p>
    </div>
  );
}

function getActionTitle(action: UserAction) {
  const map: Record<UserAction, string> = {
    approve: 'Aprovar usuário',
    suspend: 'Suspender usuário',
    block: 'Bloquear usuário',
    cancel: 'Cancelar usuário',
  };

  return map[action];
}

function getActionDescription(action: UserAction) {
  const map: Record<UserAction, string> = {
    approve:
      'Confirme se este usuário está autorizado a utilizar o sistema.',
    suspend:
      'Usuário suspenso não poderá acessar temporariamente o sistema.',
    block:
      'Usuário bloqueado não poderá acessar o sistema até nova aprovação.',
    cancel:
      'Usuário cancelado ficará desativado no sistema.',
  };

  return map[action];
}

function getActionConfirmText(action: UserAction) {
  const map: Record<UserAction, string> = {
    approve: 'Confirmar aprovação',
    suspend: 'Confirmar suspensão',
    block: 'Confirmar bloqueio',
    cancel: 'Confirmar cancelamento',
  };

  return map[action];
}

function getActionButtonClass(action: UserAction) {
  const map: Record<UserAction, string> = {
    approve: 'bg-green-600 hover:bg-green-700 shadow-green-950/20',
    suspend: 'bg-orange-500 hover:bg-orange-600 shadow-orange-950/20',
    block: 'bg-red-600 hover:bg-red-700 shadow-red-950/20',
    cancel: 'bg-slate-700 hover:bg-slate-800 shadow-slate-950/20',
  };

  return map[action];
}

function StatusBadge({ status }: { status: string }) {
  const classes: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-green-100 text-green-700',
    suspended: 'bg-orange-100 text-orange-700',
    blocked: 'bg-red-100 text-red-700',
    cancelled: 'bg-slate-200 text-slate-700',
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black ${
        classes[status] || 'bg-slate-100 text-slate-700'
      }`}
    >
      {translateStatus(status)}
    </span>
  );
}

function translateUserType(type: string) {
  const map: Record<string, string> = {
    student: 'Discente',
    teacher: 'Docente',
    staff: 'Servidor',
    outsourced_worker: 'Terceirizado',
    admin: 'Administrador',
    operator: 'Operador',
    mechanic: 'Mecânico',
  };

  return map[type] || type;
}

function translateStatus(status: string) {
  const map: Record<string, string> = {
    pending: 'Pendente',
    approved: 'Aprovado',
    suspended: 'Suspenso',
    blocked: 'Bloqueado',
    cancelled: 'Cancelado',
  };

  return map[status] || status;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'short',
    timeStyle: 'short',
  });
}