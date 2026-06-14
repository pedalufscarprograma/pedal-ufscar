import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';

import { NavLink, useNavigate } from 'react-router-dom';
import { socket } from '../realtime/socket';

import {
  BarChart3,
  Bike,
  ClipboardList,
  History,
  Clock3,
  CalendarClock,
  FileText,
  Home,
  LogOut,
  Menu,
  Settings,
  Users,
  Wrench,
  X,
} from 'lucide-react';

import { api } from '../api/api';
import { useAuth } from '../contexts/AuthContext';

interface DashboardLayoutProps {
  children: ReactNode;
}

interface MenuItem {
  label: string;
  path: string;
  icon: React.ElementType;
  alertCount?: number;
}

let adminAudioUnlocked = false;

function unlockAdminAudio() {
  if (adminAudioUnlocked) return;

  try {
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    gainNode.gain.setValueAtTime(0.001, audioContext.currentTime);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.01);

    adminAudioUnlocked = true;
  } catch {}
}

function playAdminNotificationSound() {
  try {
    const audioContext = new AudioContext();

    audioContext.resume();

    function beep(
      frequency: number,
      startTime: number,
      duration: number,
    ) {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = 'triangle';

      oscillator.frequency.setValueAtTime(
        frequency,
        audioContext.currentTime + startTime,
      );

      gainNode.gain.setValueAtTime(
        0.45,
        audioContext.currentTime + startTime,
      );

      gainNode.gain.exponentialRampToValueAtTime(
        0.001,
        audioContext.currentTime + startTime + duration,
      );

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.start(audioContext.currentTime + startTime);
      oscillator.stop(audioContext.currentTime + startTime + duration);
    }

    beep(900, 0, 0.18);
    beep(1300, 0.2, 0.18);
    beep(1600, 0.4, 0.28);
  } catch {}
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const hasLoadedOnceRef = useRef(false);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [pendingUsersCount, setPendingUsersCount] = useState(0);
  const [pendingRenewalsCount, setPendingRenewalsCount] = useState(0);

  function handleLogout() {
    logout();
    navigate('/');
  }

  async function loadAlerts() {
    try {
      const [requestsResponse, usersResponse, renewalsResponse] =
        await Promise.all([
          api.get('/loan-requests/pending'),
          api.get('/users'),
          api.get('/loans/renewals/pending'),
        ]);

      setPendingRequestsCount(requestsResponse.data.length);
      setPendingRenewalsCount(renewalsResponse.data.length);

      const pendingUsers = usersResponse.data.filter(
        (currentUser: { status: string }) =>
          currentUser.status === 'pending',
      );

      setPendingUsersCount(pendingUsers.length);
    } catch {
      setPendingRequestsCount(0);
      setPendingUsersCount(0);
      setPendingRenewalsCount(0);
    }
  }

  function handleRealtimeAlert() {
    if (hasLoadedOnceRef.current) {
      playAdminNotificationSound();
    }

    loadAlerts();
  }

  useEffect(() => {
    window.addEventListener('click', unlockAdminAudio);
    window.addEventListener('touchstart', unlockAdminAudio);

    return () => {
      window.removeEventListener('click', unlockAdminAudio);
      window.removeEventListener('touchstart', unlockAdminAudio);
    };
  }, []);

  useEffect(() => {
    loadAlerts().finally(() => {
      hasLoadedOnceRef.current = true;
    });

    socket.connect();

    if (user?.id) {
      socket.emit('register-user', {
        userId: user.id,
        userType: user.userType,
      });
    }

    socket.on('notifications.updated', handleRealtimeAlert);
    socket.on('dashboard.updated', handleRealtimeAlert);
    socket.on('users.updated', handleRealtimeAlert);
    socket.on('loan-requests.updated', handleRealtimeAlert);

    const interval = window.setInterval(() => {
      loadAlerts();
    }, 30000);

    return () => {
      socket.off('notifications.updated', handleRealtimeAlert);
      socket.off('dashboard.updated', handleRealtimeAlert);
      socket.off('users.updated', handleRealtimeAlert);
      socket.off('loan-requests.updated', handleRealtimeAlert);
      window.clearInterval(interval);
    };
  }, [user?.id, user?.userType]);

  const menuItems: MenuItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: Home },
    {
      label: 'Solicitações',
      path: '/loan-requests',
      icon: Clock3,
      alertCount: pendingRequestsCount,
    },
    { label: 'Empréstimos', path: '/loans', icon: ClipboardList },
    {
      label: 'Renovações',
      path: '/loan-renewals',
      icon: CalendarClock,
      alertCount: pendingRenewalsCount,
    },
    { label: 'Manutenção', path: '/maintenance', icon: Wrench },
    { label: 'Equipamentos', path: '/equipments', icon: Bike },
    {
      label: 'Usuários',
      path: '/users',
      icon: Users,
      alertCount: pendingUsersCount,
    },
    { label: 'Ocorrências', path: '/lost-reports', icon: FileText },
    { label: 'Relatórios', path: '/reports', icon: BarChart3 },
    { label: 'Histórico', path: '/audit-logs', icon: History },
    {
      label: 'Funcionamento',
      path: '/operating-hours',
      icon: CalendarClock,
    },
    { label: 'Configurações', path: '/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 flex-col justify-between bg-slate-950 px-6 py-6 text-white shadow-xl lg:flex">
          <SidebarContent
            menuItems={menuItems}
            onLogout={handleLogout}
            onNavigate={() => {}}
          />
        </aside>

        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-slate-950/60"
              onClick={() => setMobileMenuOpen(false)}
            />

            <aside className="relative z-10 flex h-full w-72 flex-col justify-between bg-slate-950 px-6 py-6 text-white shadow-2xl">
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="absolute right-4 top-4 rounded-xl p-2 text-slate-300 hover:bg-slate-800"
              >
                <X size={22} />
              </button>

              <SidebarContent
                menuItems={menuItems}
                onLogout={handleLogout}
                onNavigate={() => setMobileMenuOpen(false)}
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
                <h2 className="text-lg font-black text-slate-900 lg:text-2xl">
                  Sistema PEDAL-UFSCar
                </h2>

                <p className="mt-1 hidden text-sm text-slate-500 sm:block">
                  Gestão de empréstimos de bicicletas
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
              <p className="max-w-[130px] truncate text-sm font-bold text-slate-900 sm:max-w-none">
                {user?.fullName}
              </p>

              <p className="text-xs uppercase tracking-wide text-slate-500">
                {translateUserType(user?.userType)}
              </p>
            </div>
          </header>

          <section className="flex-1 p-5 lg:p-10">{children}</section>
        </main>
      </div>
    </div>
  );
}

interface SidebarContentProps {
  menuItems: MenuItem[];
  onLogout: () => void;
  onNavigate: () => void;
}

function SidebarContent({
  menuItems,
  onLogout,
  onNavigate,
}: SidebarContentProps) {
  return (
    <>
      <div>
        <div className="mb-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 shadow-lg">
            <Bike size={28} />
          </div>

          <h1 className="mt-4 text-2xl font-black tracking-wide">PEDAL</h1>

          <p className="text-sm text-slate-400">Sistema UFSCar</p>
        </div>

        <nav className="flex flex-col gap-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const hasAlert = Boolean(item.alertCount && item.alertCount > 0);

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onNavigate}
                className={({ isActive }) =>
                  [
                    'flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition',
                    hasAlert && !isActive
                      ? 'bg-red-600 text-white shadow-lg shadow-red-950/30 hover:bg-red-700'
                      : '',
                    isActive
                      ? hasAlert
                        ? 'bg-red-600 text-white shadow-lg shadow-red-950/40'
                        : 'bg-blue-600 text-white shadow-lg shadow-blue-950/40'
                      : !hasAlert
                        ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        : '',
                  ].join(' ')
                }
              >
                <span className="flex items-center gap-3">
                  <Icon size={19} />
                  {item.label}
                </span>

                {hasAlert && (
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-black text-red-600">
                    {item.alertCount}
                  </span>
                )}
              </NavLink>
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

function translateUserType(type?: string) {
  const map: Record<string, string> = {
    student: 'Discente',
    teacher: 'Docente',
    staff: 'Servidor',
    outsourced_worker: 'Terceirizado',
    admin: 'Administrador',
    operator: 'Operador',
    mechanic: 'Mecânico',
  };

  if (!type) return 'Usuário';

  return map[type] || type;
}
