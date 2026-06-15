import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';

import SignatureCanvas from 'react-signature-canvas';
import { toast } from 'sonner';

import {
  AlertTriangle,
  Bike,
  ClipboardList,
  Download,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Trash2,
  User as UserIcon,
  X,
} from 'lucide-react';

import { api } from '../api/api';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { exportToCsv } from '../utils/exportCsv';


interface User {
  id: string;
  fullName: string;
  email: string;
  status: string;
  photoUrl: string | null;
}

interface Equipment {
  id: string;
  code: string;
  name: string;
  type: string;
  status: string;
  photoUrl: string | null;
}

interface Loan {
  id: string;
  user: User;

  equipment: Equipment;
  helmet: Equipment | null;
  lock: Equipment | null;

  loanDate: string;
  expectedReturnDate: string;
  returnDate: string | null;

  status: string;

  purpose: string | null;
  notes: string | null;
  returnNotes: string | null;

  responsibilityTermAccepted: boolean;
  responsibilityTermAcceptedAt: string | null;
  responsibilityTermText: string | null;
  signatureImage: string | null;
}

type LoanAction = 'return' | 'lost' | 'damaged';

interface SelectedLoanAction {
  loan: Loan;
  action: LoanAction;
}

export default function LoansPage() {
  const signatureRef = useRef<SignatureCanvas | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);

  const [defaultReturnMessage, setDefaultReturnMessage] = useState(
    'Bicicleta devolvida em bom estado.',
  );

  const [maxLoanHours, setMaxLoanHours] = useState(24);
  const [responsibilityTerm, setResponsibilityTerm] = useState('');
  const [acceptedResponsibilityTerm, setAcceptedResponsibilityTerm] =
    useState(false);

  const [selectedImage, setSelectedImage] = useState<string | null>(null,);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [userId, setUserId] = useState('');
  const [equipmentId, setEquipmentId] = useState('');
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [purpose, setPurpose] = useState('');
  const [notes, setNotes] = useState('');

  const [selectedLoanAction, setSelectedLoanAction] =
    useState<SelectedLoanAction | null>(null);

  const [selectedTermLoan, setSelectedTermLoan] = useState<Loan | null>(null);
  const [returnNotes, setReturnNotes] = useState(defaultReturnMessage);

  const approvedUsers = useMemo(
    () => users.filter((user) => user.status === 'approved'),
    [users],
  );

  const availableBikes = useMemo(
    () =>
      equipments.filter(
        (equipment) =>
          equipment.type === 'bike' && equipment.status === 'available',
      ),
    [equipments],
  );

  const filteredLoans = useMemo(() => {
    return loans.filter((loan) => {
      const searchText = `
        ${loan.user?.fullName || ''}
        ${loan.user?.email || ''}
        ${loan.equipment?.code || ''}
        ${loan.equipment?.name || ''}
        ${loan.purpose || ''}
        ${loan.notes || ''}
      `.toLowerCase();

      return (
        searchText.includes(search.toLowerCase()) &&
        (statusFilter === 'all' || loan.status === statusFilter)
      );
    });
  }, [loans, search, statusFilter]);

  function getDefaultExpectedReturnDate(hours: number) {
    const date = new Date();

    date.setHours(date.getHours() + hours);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hour}:${minute}`;
  }

  async function loadSettings() {
    try {
      const [
        returnMessageResponse,
        maxLoanHoursResponse,
        responsibilityTermResponse,
      ] = await Promise.all([
        api.get('/settings/default_return_message'),
        api.get('/settings/max_loan_hours'),
        api.get('/settings/responsibility_term'),
      ]);

      const returnMessage =
        returnMessageResponse.data?.value ||
        'Bicicleta devolvida em bom estado.';

      const hours = Number(maxLoanHoursResponse.data?.value || 24);

      setDefaultReturnMessage(returnMessage);
      setReturnNotes(returnMessage);

      setMaxLoanHours(hours);
      setExpectedReturnDate(getDefaultExpectedReturnDate(hours));

      setResponsibilityTerm(responsibilityTermResponse.data?.value || '');
    } catch {
      setDefaultReturnMessage('Bicicleta devolvida em bom estado.');
      setReturnNotes('Bicicleta devolvida em bom estado.');

      setMaxLoanHours(24);
      setExpectedReturnDate(getDefaultExpectedReturnDate(24));

      setResponsibilityTerm('');
    }
  }

  async function loadData() {
    try {
      setLoading(true);

      const [usersResponse, equipmentsResponse, loansResponse] =
        await Promise.all([
          api.get('/users'),
          api.get('/equipments'),
          api.get('/loans'),
        ]);

      setUsers(usersResponse.data);
      setEquipments(equipmentsResponse.data);
      setLoans(loansResponse.data);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          'Erro ao carregar dados de empréstimos.',
      );
    } finally {
      setLoading(false);
    }
  }

  function clearSignature() {
    signatureRef.current?.clear();
  }

  async function handleCreateLoan(event: FormEvent) {
    event.preventDefault();

    if (!userId || !equipmentId || !expectedReturnDate) {
      toast.warning('Selecione usuário, bicicleta e data prevista.');
      return;
    }

    if (!acceptedResponsibilityTerm) {
      toast.warning('É necessário confirmar o termo de responsabilidade.');
      return;
    }

    if (!signatureRef.current || signatureRef.current.isEmpty()) {
      toast.warning('É necessário coletar a assinatura do usuário.');
      return;
    }

    const signatureImage = signatureRef.current
      .getCanvas()
      .toDataURL('image/png');

    try {
      await api.post('/loans', {
        userId,
        equipmentId,
        expectedReturnDate: new Date(expectedReturnDate).toISOString(),
        purpose,
        notes,
        responsibilityTermAccepted: acceptedResponsibilityTerm,
        responsibilityTermText: responsibilityTerm,
        signatureImage,
      });

      setUserId('');
      setEquipmentId('');
      setExpectedReturnDate(getDefaultExpectedReturnDate(maxLoanHours));
      setPurpose('');
      setNotes('');
      setAcceptedResponsibilityTerm(false);
      clearSignature();

      await loadData();

      toast.success('Empréstimo registrado com sucesso!');
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || 'Erro ao registrar empréstimo.',
      );
    }
  }

  function openActionModal(loan: Loan, action: LoanAction) {
    setSelectedLoanAction({
      loan,
      action,
    });

    if (action === 'return') {
      setReturnNotes(defaultReturnMessage);
    }

    if (action === 'lost') {
      setReturnNotes('Equipamento registrado como perdido durante o empréstimo.');
    }

    if (action === 'damaged') {
      setReturnNotes('Equipamento devolvido com dano registrado.');
    }
  }

  function closeActionModal() {
    setSelectedLoanAction(null);
    setReturnNotes(defaultReturnMessage);
  }

  function openTermModal(loan: Loan) {
    setSelectedTermLoan(loan);
  }

  function closeTermModal() {
    setSelectedTermLoan(null);
  }

  async function handleConfirmLoanAction() {
    if (!selectedLoanAction) return;

    const endpointMap: Record<LoanAction, string> = {
      return: `/loans/${selectedLoanAction.loan.id}/return`,
      lost: `/loans/${selectedLoanAction.loan.id}/lost`,
      damaged: `/loans/${selectedLoanAction.loan.id}/damaged`,
    };

    const successMap: Record<LoanAction, string> = {
      return: 'Devolução registrada com sucesso!',
      lost: 'Equipamento registrado como perdido!',
      damaged: 'Equipamento registrado como danificado!',
    };

    try {
      await api.patch(endpointMap[selectedLoanAction.action], {
        returnNotes,
      });

      await loadData();

      closeActionModal();

      toast.success(successMap[selectedLoanAction.action]);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          'Erro ao atualizar empréstimo.',
      );
    }
  }

  function handleExportLoans() {
    exportToCsv(
      'emprestimos-pedal-ufscar.csv',
      filteredLoans.map((loan) => ({
        Usuário: loan.user?.fullName || '',
        Email: loan.user?.email || '',
        Bicicleta: loan.equipment?.name || '',
        Código: loan.equipment?.code || '',
        Retirada: formatDate(loan.loanDate),
        Previsão: formatDate(loan.expectedReturnDate),
        Devolução: loan.returnDate
          ? formatDate(loan.returnDate)
          : 'Não devolvido',
        Status: translateStatus(loan.status),
        Finalidade: loan.purpose || '',
        Observações: loan.notes || '',
        ObservaçõesDevolução: loan.returnNotes || '',
        TermoAceito: loan.responsibilityTermAccepted ? 'Sim' : 'Não',
        DataAceite: loan.responsibilityTermAcceptedAt
          ? formatDate(loan.responsibilityTermAcceptedAt)
          : '',
      })),
    );
  }

  useEffect(() => {
    loadSettings();
    loadData();
  }, []);

  return (
    <DashboardLayout>
      <div>
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-950/20">
              <ClipboardList size={24} />
            </div>

            <div>
              <h1 className="text-3xl font-black text-slate-900">
                Empréstimos
              </h1>

              <p className="mt-1 text-slate-500">
                Registre retiradas, acompanhe empréstimos ativos e finalize devoluções.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={handleExportLoans}
              className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 font-bold text-white shadow-lg shadow-slate-950/20 transition hover:bg-slate-800"
            >
              <Download size={18} />
              Exportar CSV
            </button>

            <button
              onClick={() => {
                loadSettings();
                loadData();
              }}
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white shadow-lg shadow-blue-950/20 transition hover:bg-blue-700"
            >
              <RefreshCw size={18} />
              Atualizar
            </button>
          </div>
        </div>

        <div className="mb-4 rounded-2xl border border-indigo-100 bg-indigo-50 px-5 py-4 text-sm font-semibold text-indigo-700">
          Tempo máximo configurado para empréstimo: {maxLoanHours} hora(s).
        </div>

        <form
          onSubmit={handleCreateLoan}
          className="mb-8 rounded-3xl bg-white p-6 shadow-lg shadow-slate-200/60"
        >
          <div className="mb-6 flex items-center gap-3">
            <Send className="text-indigo-600" size={24} />

            <h2 className="text-xl font-black text-slate-900">
              Novo empréstimo
            </h2>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-bold text-slate-700">
                Usuário aprovado
              </span>

              <select
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                required
                className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              >
                <option value="">Selecione</option>

                {approvedUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.fullName} — {user.email}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-bold text-slate-700">
                Bicicleta disponível
              </span>

              <select
                value={equipmentId}
                onChange={(e) => setEquipmentId(e.target.value)}
                required
                className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              >
                <option value="">Selecione</option>

                {availableBikes.map((bike) => (
                  <option key={bike.id} value={bike.id}>
                    {bike.code} — {bike.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-bold text-slate-700">
                Previsão de devolução
              </span>

              <input
                type="datetime-local"
                value={expectedReturnDate}
                onChange={(e) => setExpectedReturnDate(e.target.value)}
                required
                className="h-12 rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </label>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <input
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Finalidade de uso"
              className="h-12 rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />

            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações do empréstimo"
              className="h-12 rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          {responsibilityTerm && (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <h3 className="font-black text-amber-900">
                Termo de responsabilidade
              </h3>

              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-amber-800">
                {responsibilityTerm}
              </p>

              <label className="mt-4 flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={acceptedResponsibilityTerm}
                  onChange={(e) =>
                    setAcceptedResponsibilityTerm(e.target.checked)
                  }
                  className="mt-1 h-4 w-4"
                />

                <span className="text-sm font-semibold text-amber-900">
                  Confirmo que o usuário leu e aceitou o termo de responsabilidade.
                </span>
              </label>

              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-sm font-black text-amber-900">
                    Assinatura digital do usuário
                  </span>

                  <button
                    type="button"
                    onClick={clearSignature}
                    className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-amber-800 ring-1 ring-amber-200 transition hover:bg-amber-100"
                  >
                    <Trash2 size={14} />
                    Limpar
                  </button>
                </div>

                <div className="overflow-hidden rounded-xl border-2 border-dashed border-amber-300 bg-white">
                  <SignatureCanvas
                    ref={signatureRef}
                    penColor="black"
                    canvasProps={{
                      width: 900,
                      height: 220,
                      className: 'h-44 w-full bg-white',
                    }}
                  />
                </div>

                <p className="mt-2 text-xs font-semibold text-amber-800">
                  Peça para o usuário assinar acima usando o mouse, touchpad ou tela sensível ao toque.
                </p>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="mt-6 rounded-xl bg-indigo-600 px-6 py-3 font-black text-white shadow-lg shadow-indigo-950/20 transition hover:bg-indigo-700"
          >
            Registrar empréstimo
          </button>
        </form>

        <div className="mb-6 grid gap-4 rounded-3xl bg-white p-5 shadow-lg shadow-slate-200/60 lg:grid-cols-3">
          <div className="relative lg:col-span-2">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por usuário, e-mail, bicicleta ou finalidade..."
              className="h-12 w-full rounded-xl border border-slate-200 pl-11 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          >
            <option value="all">Todos os status</option>
            <option value="active">Ativos</option>
            <option value="returned">Devolvidos</option>
            <option value="late">Atrasados</option>
            <option value="lost">Perdidos</option>
            <option value="cancelled">Cancelados</option>
          </select>
        </div>

        <div className="w-full rounded-3xl bg-white shadow-lg shadow-slate-200/60">
        
          {loading ? (
            <div className="p-8 text-center font-semibold text-slate-500">
              Carregando empréstimos...
            </div>
          ) : filteredLoans.length === 0 ? (
            <div className="p-8 text-center font-semibold text-slate-500">
              Nenhum empréstimo encontrado.
            </div>
          ) : (
            
            <div className="w-full overflow-x-auto">
              <table className="min-w-[1400px] w-full border-collapse">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                      Usuário
                    </th>

                    <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                      Bicicleta
                    </th>

                    <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                      Retirada
                    </th>

                    <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                      Previsão
                    </th>

                    <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                      Devolução
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
                  {filteredLoans.map((loan) => (
                    <tr key={loan.id} className="transition hover:bg-slate-50">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          {loan.user?.photoUrl ? (
                            <img
                              src={loan.user.photoUrl}
                              alt={loan.user.fullName}
                              className="h-12 w-12 rounded-2xl object-cover"
                            />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                              <UserIcon size={22} />
                            </div>
                          )}

                          <div>
                            <p className="font-bold text-slate-900">
                              {loan.user?.fullName}
                            </p>

                            <p className="text-xs text-slate-400">
                              {loan.user?.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          {loan.equipment?.photoUrl ? (
                            
                            <img
                              src={loan.equipment.photoUrl}
                              alt={loan.equipment.name}
                              onClick={() =>
                                setSelectedImage(loan.equipment.photoUrl)
                              }
                              className="h-20 w-24 cursor-pointer rounded-2xl object-cover transition hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-12 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                              <Bike size={22} />
                            </div>
                          )}

                          <div>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                              {loan.equipment?.code}
                            </span>

                            <p className="mt-2 text-sm font-semibold text-slate-700">
                              {loan.equipment?.name}
                            </p>

                            <div className="mt-3 flex flex-col gap-2">

                              {loan.helmet && (
                                <div className="flex items-center gap-2">

                                  {loan.helmet.photoUrl ? (
                                    <img
                                      src={loan.helmet.photoUrl}
                                      alt={loan.helmet.name}
                                      className="h-10 w-10 rounded-lg object-cover border"
                                    />
                                  ) : (
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-100">
                                      🪖
                                    </div>
                                  )}

                                  <div>
                                    <p className="text-xs font-bold text-cyan-700">
                                      {loan.helmet.name}
                                    </p>

                                    <p className="text-xs text-slate-500">
                                      {loan.helmet.code}
                                    </p>
                                  </div>

                                </div>
                              )}

                              {loan.lock && (
                                <div className="flex items-center gap-2">

                                  {loan.lock.photoUrl ? (
                                    <img
                                      src={loan.lock.photoUrl}
                                      alt={loan.lock.name}
                                      className="h-10 w-10 rounded-lg object-cover border"
                                    />
                                  ) : (
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                                      🔒
                                    </div>
                                  )}

                                  <div>
                                    <p className="text-xs font-bold text-emerald-700">
                                      {loan.lock.name}
                                    </p>

                                    <p className="text-xs text-slate-500">
                                      {loan.lock.code}
                                    </p>
                                  </div>

                                </div>
                              )}

                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-5 text-sm text-slate-600">
                        {formatDate(loan.loanDate)}
                      </td>

                      <td className="px-6 py-5 text-sm text-slate-600">
                        {formatDate(loan.expectedReturnDate)}
                      </td>

                      <td className="px-6 py-5 text-sm text-slate-600">
                        {loan.returnDate
                          ? formatDate(loan.returnDate)
                          : 'Não devolvido'}
                      </td>

                      <td className="px-6 py-5">
                        <StatusBadge status={loan.status} />
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-2">
                          {loan.responsibilityTermAccepted && (
                            <button
                              type="button"
                              onClick={() => openTermModal(loan)}
                              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800"
                            >
                              Ver termo
                            </button>
                          )}

                          {(loan.status === 'active' ||
                            loan.status === 'late') && (
                            <>
                              <button
                                onClick={() => openActionModal(loan, 'return')}
                                className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700"
                              >
                                <RotateCcw size={16} />
                                Devolver
                              </button>

                              <button
                                onClick={() => openActionModal(loan, 'damaged')}
                                className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-orange-600"
                              >
                                <AlertTriangle size={16} />
                                Danificado
                              </button>

                              <button
                                onClick={() => openActionModal(loan, 'lost')}
                                className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700"
                              >
                                <AlertTriangle size={16} />
                                Perdido
                              </button>
                            </>
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

        {selectedImage && (
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4"
            onClick={() => setSelectedImage(null)}
          >
            <div className="relative max-h-[90vh] max-w-[90vw]">
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute -right-3 -top-3 flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-xl font-bold text-white shadow-lg"
              >
                ×
              </button>

              <img
                src={selectedImage}
                alt="Imagem ampliada"
                className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain"
              />
            </div>
          </div>
        )}

        {selectedTermLoan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
            <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">
                    Termo de responsabilidade
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Documento aceito e assinado pelo usuário.
                  </p>
                </div>

                <button
                  onClick={closeTermModal}
                  className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  <X size={22} />
                </button>
              </div>

              <div className="mb-5 rounded-2xl bg-slate-50 p-5">
                <div className="grid gap-5 md:grid-cols-2">

                  <div className="flex items-center gap-4">
                    {selectedTermLoan.user?.photoUrl ? (
                      <img
                        src={selectedTermLoan.user.photoUrl}
                        alt={selectedTermLoan.user.fullName}
                        className="h-20 w-20 rounded-2xl object-cover"
                      />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-200">
                        <UserIcon size={32} />
                      </div>
                    )}

                    <div>
                      <p className="text-sm text-slate-500">Usuário</p>

                      <p className="font-bold text-slate-900">
                        {selectedTermLoan.user?.fullName}
                      </p>

                      <p className="text-sm text-slate-500">
                        {selectedTermLoan.user?.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {selectedTermLoan.equipment?.photoUrl ? (
                      <img
                        src={selectedTermLoan.equipment.photoUrl}
                        alt={selectedTermLoan.equipment.name}
                        className="h-20 w-28 rounded-2xl object-cover"
                      />
                    ) : (
                      <div className="flex h-20 w-28 items-center justify-center rounded-2xl bg-slate-200">
                        <Bike size={32} />
                      </div>
                    )}

                    <div>
                      <p className="text-sm text-slate-500">Bicicleta</p>

                      <p className="font-bold text-slate-900">
                        {selectedTermLoan.equipment?.name}
                      </p>

                      <p className="text-sm text-slate-500">
                        {selectedTermLoan.equipment?.code}
                        {selectedTermLoan.helmet && (
                          <div className="mt-3 flex items-center gap-3">
                            {selectedTermLoan.helmet.photoUrl ? (
                              <img
                                src={selectedTermLoan.helmet.photoUrl}
                                alt={selectedTermLoan.helmet.name}
                                className="h-14 w-14 rounded-xl object-cover"
                              />
                            ) : null}

                            <div>
                              <p className="text-sm text-slate-500">Capacete</p>
                              <p className="font-bold text-slate-900">
                                {selectedTermLoan.helmet.name}
                              </p>
                            </div>
                          </div>
                        )}

                        {selectedTermLoan.lock && (
                          <div className="mt-3 flex items-center gap-3">
                            {selectedTermLoan.lock.photoUrl ? (
                              <img
                                src={selectedTermLoan.lock.photoUrl}
                                alt={selectedTermLoan.lock.name}
                                className="h-14 w-14 rounded-xl object-cover"
                              />
                            ) : null}

                            <div>
                              <p className="text-sm text-slate-500">Trava</p>
                              <p className="font-bold text-slate-900">
                                {selectedTermLoan.lock.name}
                              </p>
                            </div>
                          </div>
                        )}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-slate-500">
                      Data de aceite
                    </p>

                    <p className="font-bold text-slate-900">
                      {selectedTermLoan.responsibilityTermAcceptedAt
                        ? formatDate(
                            selectedTermLoan.responsibilityTermAcceptedAt,
                          )
                        : 'Não informado'}
                    </p>
                  </div>

                </div>
              </div>

              <div className="mb-5 rounded-2xl border border-slate-200 p-5">
                <h3 className="font-black text-slate-900">
                  Texto do termo
                </h3>

                <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-slate-700">
                  {selectedTermLoan.responsibilityTermText ||
                    'Termo não registrado.'}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-5">
                <h3 className="font-black text-slate-900">
                  Assinatura digital
                </h3>

                {selectedTermLoan.signatureImage ? (
                  <img
                    src={selectedTermLoan.signatureImage}
                    alt="Assinatura digital"
                    className="mt-4 max-h-72 rounded-xl border border-slate-200 bg-white object-contain"
                  />
                ) : (
                  <p className="mt-3 text-sm text-slate-500">
                    Nenhuma assinatura registrada.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {selectedLoanAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
            <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">
                    {getActionTitle(selectedLoanAction.action)}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {getActionDescription(selectedLoanAction.action)}
                  </p>
                </div>

                <button
                  onClick={closeActionModal}
                  className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  <X size={22} />
                </button>
              </div>

              <div className="mb-5 rounded-2xl bg-slate-50 p-5">
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="flex items-center gap-4">
                    {selectedLoanAction.loan.user?.photoUrl ? (
                      <img
                        src={selectedLoanAction.loan.user.photoUrl}
                        alt={selectedLoanAction.loan.user.fullName}
                        className="h-20 w-20 rounded-2xl object-cover"
                      />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-200">
                        <UserIcon size={32} />
                      </div>
                    )}

                    <div>
                      <p className="text-sm text-slate-500">
                        Usuário
                      </p>

                      <p className="font-bold text-slate-900">
                        {selectedLoanAction.loan.user?.fullName}
                      </p>

                      <p className="text-sm text-slate-500">
                        {selectedLoanAction.loan.user?.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {selectedLoanAction.loan.equipment?.photoUrl ? (
                      <img
                        src={selectedLoanAction.loan.equipment.photoUrl}
                        alt={selectedLoanAction.loan.equipment.name}
                        className="h-20 w-28 rounded-2xl object-cover"
                      />
                    ) : (
                      <div className="flex h-20 w-28 items-center justify-center rounded-2xl bg-slate-200">
                        <Bike size={32} />
                      </div>
                    )}

                    <div>
                      <p className="text-sm text-slate-500">
                        Bicicleta
                      </p>

                      <p className="font-bold text-slate-900">
                        {selectedLoanAction.loan.equipment?.name}
                      </p>

                      <p className="text-sm text-slate-500">
                        {selectedLoanAction.loan.equipment?.code}
                      </p>
                    </div>
                  </div>

                  {selectedLoanAction.loan.helmet && (
                    <div className="flex items-center gap-4">
                      {selectedLoanAction.loan.helmet.photoUrl ? (
                        <img
                          src={selectedLoanAction.loan.helmet.photoUrl}
                          alt={selectedLoanAction.loan.helmet.name}
                          className="h-16 w-16 rounded-2xl object-cover"
                        />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-200 text-2xl">
                          🪖
                        </div>
                      )}

                      <div>
                        <p className="text-sm text-slate-500">
                          Capacete
                        </p>

                        <p className="font-bold text-slate-900">
                          {selectedLoanAction.loan.helmet.name}
                        </p>

                        <p className="text-sm text-slate-500">
                          {selectedLoanAction.loan.helmet.code}
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedLoanAction.loan.lock && (
                    <div className="flex items-center gap-4">
                      {selectedLoanAction.loan.lock.photoUrl ? (
                        <img
                          src={selectedLoanAction.loan.lock.photoUrl}
                          alt={selectedLoanAction.loan.lock.name}
                          className="h-16 w-16 rounded-2xl object-cover"
                        />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-200 text-2xl">
                          🔒
                        </div>
                      )}

                      <div>
                        <p className="text-sm text-slate-500">
                          Trava
                        </p>

                        <p className="font-bold text-slate-900">
                          {selectedLoanAction.loan.lock.name}
                        </p>

                        <p className="text-sm text-slate-500">
                          {selectedLoanAction.loan.lock.code}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-bold text-slate-700">
                  Observações
                </span>

                <textarea
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  className="min-h-28 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </label>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={closeActionModal}
                  className="rounded-xl bg-slate-100 px-5 py-3 font-bold text-slate-700 transition hover:bg-slate-200"
                >
                  Cancelar
                </button>

                <button
                  onClick={handleConfirmLoanAction}
                  className={`${getActionButtonClass(
                    selectedLoanAction.action,
                  )} rounded-xl px-5 py-3 font-black text-white shadow-lg transition`}
                >
                  {getActionConfirmText(selectedLoanAction.action)}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function getActionTitle(action: LoanAction) {
  const map: Record<LoanAction, string> = {
    return: 'Registrar devolução',
    lost: 'Registrar como perdido',
    damaged: 'Registrar como danificado',
  };

  return map[action];
}

function getActionDescription(action: LoanAction) {
  const map: Record<LoanAction, string> = {
    return: 'Confirme a devolução da bicicleta.',
    lost: 'Use esta opção quando o equipamento não foi devolvido ou foi perdido.',
    damaged:
      'Use esta opção quando o equipamento foi devolvido com dano e deve sair de circulação.',
  };

  return map[action];
}

function getActionConfirmText(action: LoanAction) {
  const map: Record<LoanAction, string> = {
    return: 'Confirmar devolução',
    lost: 'Confirmar perda',
    damaged: 'Confirmar dano',
  };

  return map[action];
}

function getActionButtonClass(action: LoanAction) {
  const map: Record<LoanAction, string> = {
    return: 'bg-blue-600 hover:bg-blue-700 shadow-blue-950/20',
    lost: 'bg-red-600 hover:bg-red-700 shadow-red-950/20',
    damaged: 'bg-orange-500 hover:bg-orange-600 shadow-orange-950/20',
  };

  return map[action];
}

function StatusBadge({ status }: { status: string }) {
  const classes: Record<string, string> = {
    active: 'bg-blue-100 text-blue-700',
    returned: 'bg-green-100 text-green-700',
    late: 'bg-red-100 text-red-700',
    lost: 'bg-orange-100 text-orange-700',
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

function translateStatus(status: string) {
  const map: Record<string, string> = {
    active: 'Ativo',
    returned: 'Devolvido',
    late: 'Atrasado',
    lost: 'Perdido',
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