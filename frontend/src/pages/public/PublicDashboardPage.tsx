import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import SignatureCanvas from 'react-signature-canvas';
import { toast } from 'sonner';
import { TermsOfUse } from '../../components/TermsOfUse';

import {
  Bell,
  Bike,
  Camera,
  CheckCheck,
  ClipboardList,
  Clock3,
  FileSignature,
  FileText,
  Home,
  LogOut,
  Menu,
  RefreshCw,
  Trash2,
  Upload,
  User as UserIcon,
  X,
  XCircle,
} from 'lucide-react';

import { api } from '../../api/api';

interface User {
  id: string;
  fullName: string;
  email: string;
  photoUrl: string | null;
  termsAccepted: boolean;
  termsAcceptedAt: string | null;
  termsVersion: string | null;
}

interface Equipment {
  id: string;
  code: string;
  name: string;
  type: string;
  status: string;
  description: string | null;
  photoUrl: string | null;
  isPublished: boolean;
}

interface LoanRequest {
  id: string;
  equipment: Equipment;
  expectedReturnDate: string;
  status: string;
  purpose: string | null;
  createdAt: string;
  pickupDate: string | null;
  pickupStartTime: string | null;
  pickupEndTime: string | null;
  pickupExpiredAt: string | null;
}

interface Loan {
  id: string;
  equipment: Equipment;
  loanDate: string;
  expectedReturnDate: string;
  returnDate: string | null;
  status: string;
  responsibilityTermAccepted: boolean;
  responsibilityTermAcceptedAt: string | null;
  responsibilityTermText: string | null;
  signatureImage: string | null;
}

interface LoanRenewal {
  id: string;
  status: string;
  requestedReturnDate: string;
  approvedReturnDate: string | null;
  requestReason: string | null;
  createdAt: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

interface LostReport {
  id: string;
  type: string;
  description: string;
  policeReportUrl: string | null;
  status: string;
  createdAt: string;

  loan: {
    id: string;
    equipment: Equipment;
  };
}
  
type ActiveTab =
  | 'dashboard'
  | 'notifications'
  | 'bikes'
  | 'requests'
  | 'loans'
  | 'terms'
  | 'lostReports';
const DEFAULT_TERM = `Declaro que recebi a bicicleta em condições de uso e assumo a responsabilidade pelo seu cuidado durante o período de empréstimo.

Comprometo-me a devolver a bicicleta no prazo previsto e em bom estado de conservação.

Estou ciente de que danos, perda ou atraso na devolução poderão ser analisados pela equipe responsável pelo PEDAL-UFSCar.`;

export default function PublicDashboardPage() {
  const navigate = useNavigate();
  const signatureRef = useRef<SignatureCanvas | null>(null);

  const [user, setUser] = useState<User | null>(null);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [requests, setRequests] = useState<LoanRequest[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [lostReports, setLostReports] = useState<LostReport[]>([]);
  const [, setRenewals] = useState<LoanRenewal[]>([]);

  const [selectedRenewalLoan, setSelectedRenewalLoan] =
    useState<Loan | null>(null);

  const [renewalReason, setRenewalReason] =
    useState('');

  const [renewalDate, setRenewalDate] =
    useState('');

  const [sendingRenewal, setSendingRenewal] =
    useState(false);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [acceptedTerm, setAcceptedTerm] = useState(false);
  const [savingSignature, setSavingSignature] = useState(false);

  const [selectedProfilePhoto, setSelectedProfilePhoto] =
    useState<string | null>(null);

  const [updatingPhoto, setUpdatingPhoto] = useState(false);
  const [acceptingTerms, setAcceptingTerms] = useState(false);
  const [selectedReportLoan, setSelectedReportLoan] = useState<Loan | null>(null);
  const [reportType, setReportType] = useState('loss');
  const [reportDescription, setReportDescription] = useState('');
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [sendingReport, setSendingReport] = useState(false);

  const availableBikes = useMemo(
    () =>
      equipments.filter(
        (equipment) =>
          equipment.type === 'bike' &&
          equipment.status === 'available' &&
          equipment.isPublished === true,
      ),
    [equipments],
  );

  const unreadNotifications = useMemo(
    () => notifications.filter((notification) => !notification.isRead),
    [notifications],
  );

  const activeRequests = useMemo(
    () =>
      requests.filter(
        (request) =>
          request.status === 'pending' || request.status === 'approved',
      ),
    [requests],
  );

  const activeLoans = useMemo(
    () =>
      loans.filter(
        (loan) => loan.status === 'active' || loan.status === 'late',
      ),
    [loans],
  );

  const menuItems = [
    {
      key: 'dashboard' as ActiveTab,
      label: 'Dashboard',
      icon: Home,
      count: null,
    },
    {
      key: 'terms' as ActiveTab,
      label: 'Termos de Uso',
      icon: FileText,
      count: user?.termsAccepted ? null : 1,
    },
    {
      key: 'notifications' as ActiveTab,
      label: 'Notificações',
      icon: Bell,
      count: unreadNotifications.length,
    },
    {
      key: 'bikes' as ActiveTab,
      label: 'Bicicletas',
      icon: Bike,
      count: availableBikes.length,
    },
    {
      key: 'requests' as ActiveTab,
      label: 'Solicitações',
      icon: Clock3,
      count: activeRequests.length,
    },
    {
      key: 'loans' as ActiveTab,
      label: 'Empréstimos',
      icon: ClipboardList,
      count: activeLoans.length,
    },

    {
      key: 'lostReports' as ActiveTab,
      label: 'Ocorrências',
      icon: FileText,
      count: null,
    },
  ];

  function logout() {
    localStorage.removeItem('public_access_token');
    localStorage.removeItem('public_user');
    navigate('/public/login');
  }

  function loadUser() {
    const userText = localStorage.getItem('public_user');

    if (!userText) {
      navigate('/public/login');
      return null;
    }

    try {
      const parsedUser = JSON.parse(userText);
      setUser(parsedUser);
      return parsedUser as User;
    } catch {
      navigate('/public/login');
      return null;
    }
  }

  async function loadData() {
    const currentUser = loadUser();

    if (!currentUser) return;

    try {
      setLoading(true);

      const [
        equipmentsResponse,
        requestsResponse,
        loansResponse,
        notificationsResponse,
        lostReportsResponse,
        renewalsResponse,
      ] = await Promise.all([
        api.get('/equipments/available'),
        api.get('/loan-requests'),
        api.get('/loans'),
        api.get(`/notifications/user/${currentUser.id}`),
        api.get('/lost-reports'),
        api.get('/loans/renewals'),
      ]);

      setEquipments(equipmentsResponse.data);

      setRequests(
        requestsResponse.data.filter(
          (request: LoanRequest & { user?: User }) =>
            request.user?.id === currentUser.id,
        ),
      );

      setLoans(
        loansResponse.data.filter(
          (loan: Loan & { user?: User }) =>
            loan.user?.id === currentUser.id,
        ),
      );

      setNotifications(notificationsResponse.data);
      setLostReports(
        lostReportsResponse.data.filter(
          (report: any) =>
            report.loan?.user?.id === currentUser.id,
        ),
      );

      setRenewals(
        renewalsResponse.data.filter(
          (item: any) =>
            item.loan?.user?.id === currentUser.id,
        ),
      );
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || 'Erro ao carregar dados.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestBike(equipment: Equipment) {
    if (!user) return;

    if (!user.termsAccepted) {
      toast.warning(
        'Você precisa aceitar os termos de uso antes de solicitar bicicleta.',
      );
      changeTab('terms');
      return;
    }

    const purpose =
      prompt(
        `Informe a finalidade do uso da bicicleta ${equipment.code}:`,
        'Deslocamento no campus.',
      ) || 'Deslocamento no campus.';

    try {
      const maxLoanHoursResponse = await api.get('/settings/max_loan_hours');
      const maxLoanHours = Number(maxLoanHoursResponse.data?.value || 24);

      const expectedReturnDate = new Date();
      expectedReturnDate.setHours(expectedReturnDate.getHours() + maxLoanHours);

      await api.post('/loan-requests', {
        userId: user.id,
        equipmentId: equipment.id,
        expectedReturnDate: expectedReturnDate.toISOString(),
        purpose,
      });

      toast.success('Solicitação enviada com sucesso!');
      changeTab('requests');
      await loadData();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || 'Erro ao solicitar bicicleta.',
      );
    }
  }

  async function markNotificationAsRead(notificationId: string) {
    try {
      await api.patch(`/notifications/${notificationId}/read`);
      await loadData();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          'Erro ao marcar notificação como lida.',
      );
    }
  }

  async function markAllNotificationsAsRead() {
    if (!user) return;

    try {
      await api.patch(`/notifications/user/${user.id}/read-all`);
      await loadData();
      toast.success('Notificações marcadas como lidas.');
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          'Erro ao marcar notificações como lidas.',
      );
    }
  }

  function openSignTermModal(loan: Loan) {
    setSelectedLoan(loan);
    setAcceptedTerm(false);
    setTimeout(() => signatureRef.current?.clear(), 100);
  }

  function closeSignTermModal() {
    setSelectedLoan(null);
    setAcceptedTerm(false);
  }

  function clearSignature() {
    signatureRef.current?.clear();
  }

  async function handleSignTerm() {
    if (!selectedLoan) return;

    if (!acceptedTerm) {
      toast.warning('É necessário aceitar o termo de responsabilidade.');
      return;
    }

    if (!signatureRef.current || signatureRef.current.isEmpty()) {
      toast.warning('É necessário fazer a assinatura digital.');
      return;
    }

    const signatureImage = signatureRef.current
      .getCanvas()
      .toDataURL('image/png');

    try {
      setSavingSignature(true);

      await api.patch(`/loans/${selectedLoan.id}/sign-term`, {
        responsibilityTermAccepted: true,
        responsibilityTermText: DEFAULT_TERM,
        signatureImage,
      });

      toast.success('Termo assinado com sucesso!');

      closeSignTermModal();
      await loadData();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || 'Erro ao assinar termo.',
      );
    } finally {
      setSavingSignature(false);
    }
  }

  function openRenewalModal(loan: Loan) {
    setSelectedRenewalLoan(loan);
    setRenewalReason('');

    const currentReturnDate = new Date(loan.expectedReturnDate);
    currentReturnDate.setDate(currentReturnDate.getDate() + 1);

    const year = currentReturnDate.getFullYear();
    const month = String(currentReturnDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentReturnDate.getDate()).padStart(2, '0');
    const hour = String(currentReturnDate.getHours()).padStart(2, '0');
    const minute = String(currentReturnDate.getMinutes()).padStart(2, '0');

    setRenewalDate(`${year}-${month}-${day}T${hour}:${minute}`);
  }

  function closeRenewalModal() {
    setSelectedRenewalLoan(null);
    setRenewalReason('');
    setRenewalDate('');
  }

  async function handleCancelRequest(request: LoanRequest) {
    const confirmed = window.confirm(
      `Deseja cancelar a solicitação da bicicleta ${request.equipment?.code} — ${request.equipment?.name}?`,
    );

    if (!confirmed) return;

    try {
      await api.patch(`/loan-requests/${request.id}/cancel`);

      toast.success('Solicitação cancelada com sucesso!');
      await loadData();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          'Erro ao cancelar solicitação.',
      );
    }
  }

  function handleProfilePhotoSelected(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast.warning('Selecione apenas arquivo de imagem.');
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const image = new Image();

      image.onload = async () => {
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

        const photoUrl = canvas.toDataURL('image/jpeg', 0.7);

        try {
          setUpdatingPhoto(true);

          const response = await api.patch(`/users/${user.id}/photo`, {
            photoUrl,
          });

          const updatedUser = {
            ...user,
            photoUrl: response.data.photoUrl,
          };

          setUser(updatedUser);
          localStorage.setItem('public_user', JSON.stringify(updatedUser));

          toast.success('Foto de perfil atualizada!');
        } catch (error: any) {
          toast.error(
            error?.response?.data?.message ||
              'Erro ao atualizar foto.',
          );
        } finally {
          setUpdatingPhoto(false);
          event.target.value = '';
        }
      };

      image.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  }

  function changeTab(tab: ActiveTab) {
    setActiveTab(tab);
    setMobileMenuOpen(false);

    window.history.pushState(
      { tab },
      '',
      `/public/dashboard?tab=${tab}`,
    );
  }

  async function handleAcceptServiceTerms() {
    if (!user) return;

    const confirmed = window.confirm(
      'Ao aceitar os termos, você confirma que leu e concorda com as regras de uso do PEDAL-UFSCar. Deseja continuar?',
    );

    if (!confirmed) return;

    try {
      setAcceptingTerms(true);

      const response = await api.patch(`/users/${user.id}/accept-terms`, {
        termsVersion: '1.0',
      });

      const updatedUser = {
        ...user,
        termsAccepted: response.data.termsAccepted,
        termsAcceptedAt: response.data.termsAcceptedAt,
        termsVersion: response.data.termsVersion,
      };

      setUser(updatedUser);
      localStorage.setItem('public_user', JSON.stringify(updatedUser));

      toast.success('Termos de uso aceitos com sucesso!');

      changeTab('dashboard');
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          'Erro ao aceitar os termos de uso.',
      );
    } finally {
      setAcceptingTerms(false);
    }
  }

  function openLostReportForm(loan: Loan) {
    setSelectedReportLoan(loan);
    setReportType('loss');
    setReportDescription('');
    setReportFile(null);
    changeTab('lostReports');
  }

  async function submitLostReport() {
    if (!user || !selectedReportLoan) return;

    if (!reportDescription.trim()) {
      toast.warning('Informe a descrição da ocorrência.');
      return;
    }

    if (!reportFile) {
      toast.warning('Anexe o documento da ocorrência.');
      return;
    }

    try {
      setSendingReport(true);

      const formData = new FormData();
      formData.append('file', reportFile);

      const uploadResponse = await api.post(
        '/lost-reports/upload',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      );

      await api.post('/lost-reports', {
        loanId: selectedReportLoan.id,
        userId: user.id,
        type: reportType,
        description: reportDescription,
        occurrenceDocumentUrl: uploadResponse.data.documentUrl,
      });

      toast.success('Ocorrência registrada com documento anexado.');

      setSelectedReportLoan(null);
      setReportType('loss');
      setReportDescription('');
      setReportFile(null);

      await loadData();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          'Erro ao registrar ocorrência.',
      );
    } finally {
      setSendingReport(false);
    }
  }

  async function submitRenewalRequest() {
  if (!selectedRenewalLoan) return;

  if (!renewalDate) {
    toast.warning('Informe a nova data.');
    return;
  }

  try {
    setSendingRenewal(true);

    await api.post(`/loans/${selectedRenewalLoan.id}/request-renewal`, {
      requestedReturnDate: renewalDate,
      requestReason: renewalReason,
    });

    toast.success(
      'Solicitação de renovação enviada.',
    );

    closeRenewalModal();

    await loadData();
  } catch (error: any) {
    toast.error(
      error?.response?.data?.message ||
        'Erro ao solicitar renovação.',
    );
  } finally {
    setSendingRenewal(false);
  }
}

  useEffect(() => {
    const currentUser = loadUser();

    if (!currentUser) return;

    const params = new URLSearchParams(window.location.search);
    const tab = (params.get('tab') as ActiveTab | null) || 'dashboard';

    setActiveTab(tab);

    window.history.replaceState(
      { tab },
      '',
      `/public/dashboard?tab=${tab}`,
    );

    loadData();

    function handlePopState() {
      const params = new URLSearchParams(window.location.search);
      const currentTab =
        (params.get('tab') as ActiveTab | null) || 'dashboard';

      if (window.location.pathname !== '/public/dashboard') {
        window.history.pushState(
          { tab: 'dashboard' },
          '',
          '/public/dashboard?tab=dashboard',
        );

        setActiveTab('dashboard');
        return;
      }

      setActiveTab(currentTab);
    }

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 flex-col justify-between bg-slate-950 px-6 py-6 text-white shadow-xl lg:flex">
          <UserSidebar
            user={user}
            menuItems={menuItems}
            activeTab={activeTab}
            onChangeTab={changeTab}
            onLogout={logout}
            onPhotoClick={() =>
              user?.photoUrl && setSelectedProfilePhoto(user.photoUrl)
            }
            onPhotoChange={handleProfilePhotoSelected}
            updatingPhoto={updatingPhoto}
          />
        </aside>

        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              onClick={() => setMobileMenuOpen(false)}
              className="absolute inset-0 bg-slate-950/60"
            />

            <aside className="relative z-10 flex h-full w-72 flex-col justify-between bg-slate-950 px-6 py-6 text-white shadow-2xl">
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="absolute right-4 top-4 rounded-xl p-2 text-slate-300 hover:bg-slate-800"
              >
                <X size={22} />
              </button>

              <UserSidebar
                user={user}
                menuItems={menuItems}
                activeTab={activeTab}
                onChangeTab={changeTab}
                onLogout={logout}
                onPhotoClick={() =>
                  user?.photoUrl && setSelectedProfilePhoto(user.photoUrl)
                }
                onPhotoChange={handleProfilePhotoSelected}
                updatingPhoto={updatingPhoto}
              />
            </aside>
          </div>
        )}

        <main className="flex min-h-screen flex-1 flex-col">
          <header className="flex h-24 items-center justify-between border-b border-slate-200 bg-white px-5 shadow-sm lg:px-10">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="rounded-xl bg-slate-100 p-3 text-slate-700 lg:hidden"
              >
                <Menu size={22} />
              </button>

              <div>
                <h1 className="text-lg font-black text-slate-900 lg:text-2xl">
                  Portal do Usuário
                </h1>

                <p className="mt-1 hidden text-sm text-slate-500 sm:block">
                  PEDAL-UFSCar · Gestão de empréstimos de bicicletas
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={loadData}
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
              >
                <RefreshCw size={17} />
                Atualizar
              </button>

              <button
                onClick={logout}
                className="hidden items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 sm:flex"
              >
                <LogOut size={17} />
                Sair
              </button>
            </div>
          </header>

          <section className="flex-1 p-5 lg:p-10">
            {loading ? (
              <div className="rounded-3xl bg-white p-8 text-center font-semibold text-slate-500 shadow-lg shadow-slate-200/60">
                Carregando informações...
              </div>
            ) : (
              <div className="grid gap-6">
                {activeTab === 'dashboard' && (
                  <DashboardContent
                    unreadNotifications={unreadNotifications.length}
                    availableBikes={availableBikes.length}
                    activeRequests={activeRequests.length}
                    activeLoans={activeLoans.length}
                    latestNotifications={notifications.slice(0, 3)}
                    latestRequests={requests.slice(0, 3)}
                    latestLoans={loans.slice(0, 3)}
                    onChangeTab={changeTab}
                  />
                )}

                {activeTab === 'terms' && (
                  <TermsContent
                    user={user}
                    acceptingTerms={acceptingTerms}
                    onAcceptTerms={handleAcceptServiceTerms}
                  />
                )}

                {activeTab === 'notifications' && (
                  <NotificationsContent
                    notifications={notifications}
                    unreadCount={unreadNotifications.length}
                    onMarkAllAsRead={markAllNotificationsAsRead}
                    onMarkAsRead={markNotificationAsRead}
                  />
                )}

                {activeTab === 'bikes' && (
                  <BikesContent
                    availableBikes={availableBikes}
                    onRequestBike={handleRequestBike}
                  />
                )}

                {activeTab === 'requests' && (
                  <RequestsContent
                    requests={requests}
                    onCancelRequest={handleCancelRequest}
                  />
                )}

                {activeTab === 'loans' && (

                  <LoansContent
                    loans={loans}
                    onOpenSignTerm={openSignTermModal}
                    onOpenRenewal={openRenewalModal}
                  />
                )}
                {activeTab === 'lostReports' && (
                  <LostReportsContent
                    reports={lostReports}
                    loans={activeLoans}
                    selectedLoan={selectedReportLoan}
                    reportType={reportType}
                    reportDescription={reportDescription}
                    reportFile={reportFile}
                    sendingReport={sendingReport}
                    onOpenForm={openLostReportForm}
                    onChangeType={setReportType}
                    onChangeDescription={setReportDescription}
                    onChangeFile={setReportFile}
                    onSubmit={submitLostReport}
                    onCancel={() => setSelectedReportLoan(null)}
                  />
                )}
              </div>
            )}
          </section>
        </main>
      </div>

      {selectedLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-900">
                  Termo de responsabilidade
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Leia o termo e assine digitalmente para confirmar.
                </p>
              </div>

              <button
                onClick={closeSignTermModal}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={22} />
              </button>
            </div>

            <div className="mb-5 rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Bicicleta</p>
              <p className="font-bold text-slate-900">
                {selectedLoan.equipment.code} — {selectedLoan.equipment.name}
              </p>

              <p className="mt-3 text-sm text-slate-500">
                Previsão de devolução
              </p>
              <p className="font-bold text-slate-900">
                {formatDate(selectedLoan.expectedReturnDate)}
              </p>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <h3 className="font-black text-amber-900">
                Leia com atenção
              </h3>

              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-amber-900">
                {DEFAULT_TERM}
              </p>

              <label className="mt-4 flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={acceptedTerm}
                  onChange={(event) =>
                    setAcceptedTerm(event.target.checked)
                  }
                  className="mt-1 h-4 w-4"
                />

                <span className="text-sm font-semibold text-amber-900">
                  Confirmo que li e aceito o termo de responsabilidade.
                </span>
              </label>
            </div>

            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-sm font-black text-slate-700">
                  Assinatura digital
                </span>

                <button
                  type="button"
                  onClick={clearSignature}
                  className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
                >
                  <Trash2 size={14} />
                  Limpar
                </button>
              </div>

              <div className="overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-white">
                <SignatureCanvas
                  ref={signatureRef}
                  penColor="black"
                  canvasProps={{
                    width: 900,
                    height: 240,
                    className: 'h-48 w-full bg-white',
                  }}
                />
              </div>

              <p className="mt-2 text-xs font-semibold text-slate-500">
                Assine acima usando mouse, touchpad ou dedo no celular.
              </p>
            </div>

            <button
              onClick={handleSignTerm}
              disabled={savingSignature}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-black text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FileSignature size={18} />
              {savingSignature ? 'Salvando...' : 'Salvar assinatura'}
            </button>
          </div>
        </div>
      )}

      {selectedRenewalLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-900">
                  Solicitar renovação
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Informe a nova data desejada para devolução da bicicleta.
                </p>
              </div>

              <button
                onClick={closeRenewalModal}
                disabled={sendingRenewal}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <X size={22} />
              </button>
            </div>

            <div className="mb-5 rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Bicicleta</p>
              <p className="font-bold text-slate-900">
                {selectedRenewalLoan.equipment.code} — {selectedRenewalLoan.equipment.name}
              </p>

              <p className="mt-3 text-sm text-slate-500">
                Devolução atual
              </p>
              <p className="font-bold text-slate-900">
                {formatDate(selectedRenewalLoan.expectedReturnDate)}
              </p>
            </div>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-bold text-slate-700">
                Nova data desejada *
              </span>

              <input
                type="datetime-local"
                value={renewalDate}
                onChange={(event) => setRenewalDate(event.target.value)}
                className="h-12 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </label>

            <label className="mt-4 flex flex-col gap-2">
              <span className="text-sm font-bold text-slate-700">
                Motivo da renovação
              </span>

              <textarea
                value={renewalReason}
                onChange={(event) => setRenewalReason(event.target.value)}
                placeholder="Ex: Preciso continuar usando a bicicleta para deslocamento no campus."
                className="min-h-28 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </label>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={closeRenewalModal}
                disabled={sendingRenewal}
                className="rounded-xl bg-slate-100 px-5 py-3 font-bold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancelar
              </button>

              <button
                onClick={submitRenewalRequest}
                disabled={sendingRenewal}
                className="rounded-xl bg-amber-600 px-5 py-3 font-black text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sendingRenewal ? 'Enviando...' : 'Enviar solicitação'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedProfilePhoto && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 p-4">
          <div className="relative max-h-[90vh] max-w-4xl">
            <button
              onClick={() => setSelectedProfilePhoto(null)}
              className="absolute -right-3 -top-3 rounded-full bg-white p-2 text-slate-700 shadow-lg transition hover:bg-slate-100"
            >
              <X size={22} />
            </button>

            <img
              src={selectedProfilePhoto}
              alt="Foto de perfil ampliada"
              className="max-h-[90vh] max-w-full rounded-3xl object-contain shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function UserSidebar({
  user,
  menuItems,
  activeTab,
  onChangeTab,
  onLogout,
  onPhotoClick,
  onPhotoChange,
  updatingPhoto,
}: {
  user: User | null;
  menuItems: {
    key: ActiveTab;
    label: string;
    icon: React.ElementType;
    count: number | null;
  }[];
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
  onLogout: () => void;
  onPhotoClick: () => void;
  onPhotoChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  updatingPhoto: boolean;
}) {
  return (
    <>
      <div>
        <div className="mb-8">
          <div className="relative">
            {user?.photoUrl ? (
              <button onClick={onPhotoClick}>
                <img
                  src={user.photoUrl}
                  alt={user.fullName}
                  className="h-20 w-20 rounded-3xl object-cover ring-4 ring-white/10"
                />
              </button>
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-600 text-white">
                <UserIcon size={34} />
              </div>
            )}

            <label className="absolute -bottom-2 left-14 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700">
              <Camera size={15} />

              <input
                type="file"
                accept="image/*"
                onChange={onPhotoChange}
                disabled={updatingPhoto}
                className="hidden"
              />
            </label>
          </div>

          <h1 className="mt-5 text-2xl font-black">PEDAL-UFSCar</h1>

          <p className="mt-1 line-clamp-1 text-sm text-slate-400">
            Olá, {user?.fullName || 'usuário'}
          </p>
        </div>

        <nav className="flex flex-col gap-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            const hasCount = item.count !== null && item.count > 0;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onChangeTab(item.key)}
                className={[
                  'flex items-center justify-between rounded-xl px-4 py-3 text-sm font-bold transition',
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-950/40'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                ].join(' ')}
              >
                <span className="flex items-center gap-3">
                  <Icon size={19} />
                  {item.label}
                </span>

                {hasCount && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-black ${
                      isActive
                        ? 'bg-white text-blue-600'
                        : 'bg-red-600 text-white'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <button
        type="button"
        onClick={onLogout}
        className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-700"
      >
        <LogOut size={18} />
        Sair
      </button>
    </>
  );
}

function DashboardContent({
  unreadNotifications,
  availableBikes,
  activeRequests,
  activeLoans,
  onChangeTab,
}: {
  unreadNotifications: number;
  availableBikes: number;
  activeRequests: number;
  activeLoans: number;
  latestNotifications: Notification[];
  latestRequests: LoanRequest[];
  latestLoans: Loan[];
  onChangeTab: (tab: ActiveTab) => void;
}) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard
          title="Notificações"
          subtitle="Não lidas"
          value={unreadNotifications}
          icon={Bell}
          color="blue"
          onClick={() => onChangeTab('notifications')}
        />

        <SummaryCard
          title="Bicicletas"
          subtitle="Disponíveis"
          value={availableBikes}
          icon={Bike}
          color="green"
          onClick={() => onChangeTab('bikes')}
        />

        <SummaryCard
          title="Solicitações"
          subtitle="Ativas"
          value={activeRequests}
          icon={Clock3}
          color="amber"
          onClick={() => onChangeTab('requests')}
        />

        <SummaryCard
          title="Empréstimos"
          subtitle="Ativos"
          value={activeLoans}
          icon={ClipboardList}
          color="indigo"
          onClick={() => onChangeTab('loans')}
        />
      </div>
      
    </>
  );
}

function NotificationsContent({
  notifications,
  unreadCount,
  onMarkAllAsRead,
  onMarkAsRead,
}: {
  notifications: Notification[];
  unreadCount: number;
  onMarkAllAsRead: () => void;
  onMarkAsRead: (id: string) => void;
}) {
  return (
    <section className="rounded-3xl bg-white p-5 shadow-lg shadow-slate-200/60">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SectionHeader
          icon={Bell}
          title="Notificações"
          subtitle={`${unreadCount} não lida(s)`}
          color="blue"
        />

        {unreadCount > 0 && (
          <button
            onClick={onMarkAllAsRead}
            className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white"
          >
            <CheckCheck size={17} />
            Marcar todas como lidas
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyMessage message="Você ainda não possui notificações." />
      ) : (
        <div className="grid gap-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`rounded-2xl border p-4 ${
                notification.isRead
                  ? 'border-slate-200 bg-white'
                  : 'border-blue-200 bg-blue-50'
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-black text-slate-900">
                    {notification.title}
                  </p>

                  <p className="mt-1 text-sm leading-relaxed text-slate-600">
                    {notification.message}
                  </p>

                  <p className="mt-2 text-xs font-semibold text-slate-400">
                    {formatDate(notification.createdAt)}
                  </p>
                </div>

                {!notification.isRead && (
                  <button
                    onClick={() => onMarkAsRead(notification.id)}
                    className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white"
                  >
                    Marcar lida
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function BikesContent({
  availableBikes,
  onRequestBike,
}: {
  availableBikes: Equipment[];
  onRequestBike: (equipment: Equipment) => void;
}) {
  return (
    <section className="rounded-3xl bg-white p-5 shadow-lg shadow-slate-200/60">
      <SectionHeader
        icon={Bike}
        title="Bicicletas disponíveis"
        subtitle="Escolha uma bicicleta e envie sua solicitação"
        color="green"
      />

      {availableBikes.length === 0 ? (
        <EmptyMessage message="Nenhuma bicicleta disponível no momento." />
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {availableBikes.map((bike) => (
            <div
              key={bike.id}
              className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-md shadow-slate-200/60"
            >
              {bike.photoUrl ? (
                <img
                  src={bike.photoUrl}
                  alt={bike.name}
                  className="h-44 w-full object-cover"
                />
              ) : (
                <div className="flex h-44 w-full items-center justify-center bg-slate-100 text-slate-400">
                  <Bike size={42} />
                </div>
              )}

              <div className="p-4">
                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">
                  Disponível
                </span>

                <h3 className="mt-3 font-black text-slate-900">
                  {bike.code} — {bike.name}
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  {bike.description || 'Sem descrição'}
                </p>

                <button
                  onClick={() => onRequestBike(bike)}
                  className="mt-4 w-full rounded-xl bg-green-600 px-4 py-3 text-sm font-black text-white transition hover:bg-green-700"
                >
                  Solicitar bicicleta
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function RequestsContent({
  requests,
  onCancelRequest,
}: {
  requests: LoanRequest[];
  onCancelRequest: (request: LoanRequest) => void;
}) {
  return (
    <section className="rounded-3xl bg-white p-5 shadow-lg shadow-slate-200/60">
      <SectionHeader
        icon={Clock3}
        title="Minhas solicitações"
        subtitle="Acompanhe o andamento dos seus pedidos"
        color="amber"
      />

      {requests.length === 0 ? (
        <EmptyMessage message="Você ainda não fez solicitações." />
      ) : (
        <div className="mt-5 grid gap-3">
          {requests.map((request) => (
            <div
              key={request.id}
              className="rounded-2xl border border-slate-200 p-4"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-bold text-slate-900">
                    {request.equipment?.code} — {request.equipment?.name}
                  </p>

                  <p className="text-sm text-slate-500">
                    Solicitado em {formatDateLocal(request.createdAt)}
                  </p>
                </div>
                {request.status === 'approved' && (
                  <div className="mt-3 rounded-2xl border border-green-200 bg-green-50 p-4">
                    <p className="text-sm font-black text-green-800">
                      Retirada autorizada
                    </p>

                    <p className="mt-1 text-sm text-green-700">
                      {formatPickupWindow(request)}
                    </p>

                    <p className="mt-2 text-xs font-bold text-green-700">
                      Compareça dentro deste horário para assinar o termo e retirar a bicicleta.
                    </p>
                  </div>
                )}

                {request.status === 'expired' && (
                  <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-4">
                    <p className="text-sm font-black text-red-800">
                      Solicitação expirada
                    </p>

                    <p className="mt-1 text-sm text-red-700">
                      Você não compareceu dentro do horário de retirada informado.
                    </p>
                  </div>
                )}

                <div className="flex flex-col items-start gap-2 sm:items-end">
                  <StatusBadge status={request.status} />

                  {(request.status === 'pending' ||
                    request.status === 'approved') && (
                    <button
                      onClick={() => onCancelRequest(request)}
                      className="flex items-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-red-700"
                    >
                      <XCircle size={15} />
                      Cancelar solicitação
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function LoansContent({
  loans,
  onOpenSignTerm,
  onOpenRenewal,
}: {
  loans: Loan[];
  onOpenSignTerm: (loan: Loan) => void;
  onOpenRenewal: (loan: Loan) => void;
}) {  

  return (
    <section className="rounded-3xl bg-white p-5 shadow-lg shadow-slate-200/60">
      <SectionHeader
        icon={ClipboardList}
        title="Meus empréstimos"
        subtitle="Veja seus empréstimos ativos e anteriores"
        color="indigo"
      />

      {loans.length === 0 ? (
        <EmptyMessage message="Você ainda não possui empréstimos." />
      ) : (
        <div className="mt-5 grid gap-3">
          {loans.map((loan) => (
            <div
              key={loan.id}
              className="rounded-2xl border border-slate-200 p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-bold text-slate-900">
                    {loan.equipment?.code} — {loan.equipment?.name}
                  </p>

                  <p className="text-sm text-slate-500">
                    Retirada: {formatDate(loan.loanDate)}
                  </p>

                  <p className="text-sm text-slate-500">
                    Previsão: {formatDate(loan.expectedReturnDate)}
                  </p>

                  {loan.responsibilityTermAccepted ? (
                    <p className="mt-2 text-xs font-bold text-green-700">
                      Termo assinado em{' '}
                      {loan.responsibilityTermAcceptedAt
                        ? formatDate(loan.responsibilityTermAcceptedAt)
                        : 'data não informada'}
                    </p>
                  ) : (
                    <p className="mt-2 text-xs font-bold text-amber-700">
                      Termo ainda não assinado.
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-start gap-2 sm:items-end">
                  <StatusBadge status={loan.status} />

                  {(loan.status === 'active' ||
                    loan.status === 'late') && (
                    <button
                      onClick={() => onOpenRenewal(loan)}
                      className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700"
                    >
                      Solicitar Renovação
                    </button>
                  )}

                  {!loan.responsibilityTermAccepted &&
                    (loan.status === 'active' || loan.status === 'late') && (
                      <button
                        onClick={() => onOpenSignTerm(loan)}
                        className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-700"
                      >
                        <FileSignature size={16} />
                        Assinar Termo
                      </button>
                    )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function TermsContent({
  user,
  acceptingTerms,
  onAcceptTerms,
}: {
  user: User | null;
  acceptingTerms: boolean;
  onAcceptTerms: () => void;
}) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-lg shadow-slate-200/60">
      <SectionHeader
        icon={FileText}
        title="Termos de Uso do PEDAL-UFSCar"
        subtitle="Leia atentamente antes de utilizar o serviço"
        color="blue"
      />

      {user?.termsAccepted ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
          <p className="font-black text-green-800">
            Você já aceitou os termos de uso.
          </p>

          <p className="mt-2 text-sm text-green-700">
            Aceito em:{' '}
            {user.termsAcceptedAt
              ? formatDate(user.termsAcceptedAt)
              : 'data não informada'}
          </p>

          <p className="mt-1 text-sm text-green-700">
            Versão: {user.termsVersion || '1.0'}
          </p>
        </div>
      ) : (
        <>
          <TermsOfUse />

          <button
            onClick={onAcceptTerms}
            disabled={acceptingTerms}
            className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-3 font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {acceptingTerms
              ? 'Salvando aceite...'
              : 'Li e concordo com os termos de uso'}
          </button>
        </>
      )}
    </section>
  );
}

function SummaryCard({
  title,
  subtitle,
  value,
  icon: Icon,
  color,
  onClick,
}: {
  title: string;
  subtitle: string;
  value: number;
  icon: React.ElementType;
  color: 'blue' | 'green' | 'amber' | 'indigo';
  onClick: () => void;
}) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    amber: 'bg-amber-50 text-amber-700',
    indigo: 'bg-indigo-50 text-indigo-700',
  };

  return (
    <button
      onClick={onClick}
      className="rounded-3xl border border-slate-100 bg-white p-5 text-left shadow-lg shadow-slate-200/60 transition hover:-translate-y-1 hover:shadow-xl"
    >
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-2xl ${colorMap[color]}`}
      >
        <Icon size={25} />
      </div>

      <p className="mt-4 text-3xl font-black text-slate-900">{value}</p>
      <p className="mt-1 font-black text-slate-900">{title}</p>
      <p className="text-sm font-semibold text-slate-500">{subtitle}</p>
    </button>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  color,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  color: 'blue' | 'green' | 'amber' | 'indigo';
}) {
  const colorMap = {
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-green-600 bg-green-50',
    amber: 'text-amber-600 bg-amber-50',
    indigo: 'text-indigo-600 bg-indigo-50',
  };

  return (
    <div className="mb-5 flex items-center gap-3">
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-2xl ${colorMap[color]}`}
      >
        <Icon size={24} />
      </div>

      <div>
        <h2 className="text-xl font-black text-slate-900">{title}</h2>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}

function EmptyMessage({ message }: { message: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-5 text-center text-sm font-semibold text-slate-500">
      {message}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const classes: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    cancelled: 'bg-slate-200 text-slate-700',
    converted_to_loan: 'bg-blue-100 text-blue-700',
    active: 'bg-blue-100 text-blue-700',
    returned: 'bg-green-100 text-green-700',
    late: 'bg-red-100 text-red-700',
    lost: 'bg-orange-100 text-orange-700',
    expired: 'bg-red-100 text-red-700',
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
    pending: 'Pendente',
    approved: 'Aprovada',
    rejected: 'Rejeitada',
    cancelled: 'Cancelada',
    converted_to_loan: 'Convertida',
    active: 'Ativo',
    returned: 'Devolvido',
    late: 'Atrasado',
    lost: 'Perdido',
    expired: 'Expirada',
  };

  return map[status] || status;
}

function formatPickupWindow(request: LoanRequest) {
  if (
    !request.pickupDate ||
    !request.pickupStartTime ||
    !request.pickupEndTime
  ) {
    return 'Horário de retirada ainda não definido.';
  }

  const [year, month, day] = request.pickupDate
    .split('T')[0]
    .split('-')
    .map(Number);

  const date = new Date(year, month - 1, day, 12, 0, 0);

  const dateText = date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return `${dateText}, das ${request.pickupStartTime} às ${request.pickupEndTime}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function formatDateLocal(value: string) {
  const date = new Date(value);

  return date.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function LostReportsContent({
  reports,
  loans,
  selectedLoan,
  reportType,
  reportDescription,
  reportFile,
  sendingReport,
  onOpenForm,
  onChangeType,
  onChangeDescription,
  onChangeFile,
  onSubmit,
  onCancel,
}: {
  reports: LostReport[];
  loans: Loan[];
  selectedLoan: Loan | null;
  reportType: string;
  reportDescription: string;
  reportFile: File | null;
  sendingReport: boolean;
  onOpenForm: (loan: Loan) => void;
  onChangeType: (value: string) => void;
  onChangeDescription: (value: string) => void;
  onChangeFile: (file: File | null) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <section className="rounded-3xl bg-white p-5 shadow-lg shadow-slate-200/60">
      <SectionHeader
        icon={FileText}
        title="Ocorrências"
        subtitle="Roubo, furto ou perda"
        color="amber"
      />

      {selectedLoan ? (
        <div className="mb-6 rounded-3xl border border-orange-200 bg-orange-50 p-5">
          <h3 className="text-lg font-black text-orange-900">
            Registrar ocorrência
          </h3>

          <p className="mt-2 text-sm font-semibold text-orange-800">
            Bicicleta: {selectedLoan.equipment.code} —{' '}
            {selectedLoan.equipment.name}
          </p>

          <div className="mt-5 grid gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-bold text-slate-700">
                Tipo da ocorrência
              </span>

              <select
                value={reportType}
                onChange={(event) => onChangeType(event.target.value)}
                className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              >
                <option value="loss">Perda</option>
                <option value="theft">Furto</option>
                <option value="robbery">Roubo</option>
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-bold text-slate-700">
                Descrição do ocorrido
              </span>

              <textarea
                value={reportDescription}
                onChange={(event) =>
                  onChangeDescription(event.target.value)
                }
                placeholder="Descreva com detalhes o que aconteceu..."
                className="min-h-32 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </label>

            <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white p-6 text-center transition hover:bg-slate-50">
              <Upload size={28} className="text-orange-600" />

              <span className="mt-2 text-sm font-black text-slate-800">
                {reportFile
                  ? reportFile.name
                  : 'Clique para anexar PDF ou imagem'}
              </span>

              <span className="mt-1 text-xs font-semibold text-slate-500">
                PDF, JPG ou PNG
              </span>

              <input
                type="file"
                accept=".pdf,image/*"
                onChange={(event) =>
                  onChangeFile(event.target.files?.[0] || null)
                }
                className="hidden"
              />
            </label>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-xl bg-slate-100 px-5 py-3 font-bold text-slate-700 transition hover:bg-slate-200"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={onSubmit}
                disabled={sendingReport}
                className="rounded-xl bg-orange-600 px-5 py-3 font-black text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sendingReport ? 'Enviando...' : 'Enviar ocorrência'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-6">
          <h3 className="mb-3 font-black">
            Registrar nova ocorrência
          </h3>

          {loans.length === 0 ? (
            <EmptyMessage message="Você não possui empréstimos ativos ou atrasados para registrar ocorrência." />
          ) : (
            <div className="grid gap-3">
              {loans.map((loan) => (
                <button
                  key={loan.id}
                  onClick={() => onOpenForm(loan)}
                  className="rounded-xl border border-slate-200 p-4 text-left transition hover:bg-slate-50"
                >
                  <p className="font-bold">
                    {loan.equipment.code} — {loan.equipment.name}
                  </p>

                  <p className="text-sm text-slate-500">
                    Clique para registrar roubo, furto ou perda
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {reports.length === 0 ? (
        <EmptyMessage message="Nenhuma ocorrência registrada." />
      ) : (
        <div className="grid gap-3">
          {reports.map((report) => (
            <div
              key={report.id}
              className="rounded-2xl border border-slate-200 p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-black">
                    {translateReportType(report.type)}
                  </p>

                  <p className="mt-2 text-sm text-slate-600">
                    {report.description}
                  </p>

                  <p className="mt-2 text-xs text-slate-500">
                    {formatDate(report.createdAt)}
                  </p>
                </div>

                <StatusBadge status={report.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function translateReportType(type: string) {
  const map: Record<string, string> = {
    loss: 'Perda',
    theft: 'Furto',
    robbery: 'Roubo',
  };

  return map[type] || type;
}