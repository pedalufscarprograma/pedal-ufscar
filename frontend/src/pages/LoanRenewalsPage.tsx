import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import {
  CalendarClock,
  CheckCircle2,
  RefreshCw,
  Search,
  User as UserIcon,
  XCircle,
} from 'lucide-react';

import { api } from '../api/api';
import { DashboardLayout } from '../layouts/DashboardLayout';

interface LoanRenewal {
  id: string;
  status: string;
  oldExpectedReturnDate: string;
  requestedReturnDate: string;
  approvedReturnDate: string | null;
  requestReason: string | null;
  reviewNotes: string | null;
  createdAt: string;

  loan: {
    id: string;
    expectedReturnDate: string;

    user: {
      id: string;
      fullName: string;
      email: string;
      photoUrl: string | null;
    };

    equipment: {
      id: string;
      code: string;
      name: string;
      photoUrl: string | null;
    };
  };
}

export default function LoanRenewalsPage() {
  const [renewals, setRenewals] = useState<LoanRenewal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  async function loadRenewals() {
    try {
      setLoading(true);

      const response = await api.get('/loans/renewals/pending');

      setRenewals(response.data);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          'Erro ao carregar renovações.',
      );
    } finally {
      setLoading(false);
    }
  }

  const filteredRenewals = useMemo(() => {
    return renewals.filter((renewal) => {
      const text = `
        ${renewal.loan?.user?.fullName || ''}
        ${renewal.loan?.user?.email || ''}
        ${renewal.loan?.equipment?.code || ''}
        ${renewal.loan?.equipment?.name || ''}
        ${renewal.requestReason || ''}
      `.toLowerCase();

      return text.includes(search.toLowerCase());
    });
  }, [renewals, search]);

  async function approveRenewal(renewal: LoanRenewal) {
    const confirmed = window.confirm(
      `Deseja aprovar a renovação da bicicleta ${renewal.loan.equipment.code} para ${formatDate(renewal.requestedReturnDate)}?`,
    );

    if (!confirmed) return;

    try {
      setProcessingId(renewal.id);

      await api.patch(`/loans/renewals/${renewal.id}/approve`, {
        approvedReturnDate: renewal.requestedReturnDate,
        reviewNotes: 'Renovação aprovada pela administração.',
      });

      toast.success('Renovação aprovada com sucesso!');

      await loadRenewals();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          'Erro ao aprovar renovação.',
      );
    } finally {
      setProcessingId(null);
    }
  }

  async function rejectRenewal(renewal: LoanRenewal) {
    const reason =
      prompt(
        'Informe o motivo da rejeição:',
        'Renovação recusada pela administração.',
      ) || 'Renovação recusada pela administração.';

    try {
      setProcessingId(renewal.id);

      await api.patch(`/loans/renewals/${renewal.id}/reject`, {
        reviewNotes: reason,
      });

      toast.success('Renovação rejeitada com sucesso!');

      await loadRenewals();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          'Erro ao rejeitar renovação.',
      );
    } finally {
      setProcessingId(null);
    }
  }

  useEffect(() => {
    loadRenewals();
  }, []);

  return (
    <DashboardLayout>
      <div>
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-600 text-white shadow-lg shadow-amber-950/20">
              <CalendarClock size={24} />
            </div>

            <div>
              <h1 className="text-3xl font-black text-slate-900">
                Renovações
              </h1>

              <p className="mt-1 text-slate-500">
                Analise solicitações de renovação de empréstimos.
              </p>
            </div>
          </div>

          <button
            onClick={loadRenewals}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white shadow-lg shadow-blue-950/20 transition hover:bg-blue-700"
          >
            <RefreshCw size={18} />
            Atualizar
          </button>
        </div>

        <div className="mb-6 rounded-3xl bg-white p-5 shadow-lg shadow-slate-200/60">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por usuário, e-mail, bicicleta ou motivo..."
              className="h-12 w-full rounded-xl border border-slate-200 pl-11 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl bg-white shadow-lg shadow-slate-200/60">
          {loading ? (
            <div className="p-8 text-center font-semibold text-slate-500">
              Carregando renovações...
            </div>
          ) : filteredRenewals.length === 0 ? (
            <div className="p-8 text-center font-semibold text-slate-500">
              Nenhuma renovação pendente encontrada.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                      Usuário
                    </th>

                    <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                      Bicicleta
                    </th>

                    <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                      Data atual
                    </th>

                    <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                      Nova data solicitada
                    </th>

                    <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                      Motivo
                    </th>

                    <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                      Solicitado em
                    </th>

                    <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                      Ações
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredRenewals.map((renewal) => (
                    <tr
                      key={renewal.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          {renewal.loan?.user?.photoUrl ? (
                            <img
                              src={renewal.loan.user.photoUrl}
                              alt={renewal.loan.user.fullName}
                              className="h-12 w-12 rounded-2xl object-cover ring-2 ring-slate-100"
                            />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                              <UserIcon size={22} />
                            </div>
                          )}

                          <div>
                            <p className="font-bold text-slate-900">
                              {renewal.loan?.user?.fullName}
                            </p>

                            <p className="text-xs text-slate-400">
                              {renewal.loan?.user?.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <p className="font-bold text-slate-900">
                          {renewal.loan?.equipment?.code} —{' '}
                          {renewal.loan?.equipment?.name}
                        </p>
                      </td>

                      <td className="px-6 py-5 text-sm text-slate-600">
                        {formatDate(renewal.oldExpectedReturnDate)}
                      </td>

                      <td className="px-6 py-5 text-sm font-bold text-amber-700">
                        {formatDate(renewal.requestedReturnDate)}
                      </td>

                      <td className="px-6 py-5 text-sm text-slate-600">
                        {renewal.requestReason || 'Não informado'}
                      </td>

                      <td className="px-6 py-5 text-sm text-slate-600">
                        {formatDate(renewal.createdAt)}
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => approveRenewal(renewal)}
                            disabled={processingId === renewal.id}
                            className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <CheckCircle2 size={16} />
                            Aprovar
                          </button>

                          <button
                            onClick={() => rejectRenewal(renewal)}
                            disabled={processingId === renewal.id}
                            className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <XCircle size={16} />
                            Rejeitar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'short',
    timeStyle: 'short',
  });
}