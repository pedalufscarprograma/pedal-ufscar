import { Route, Routes } from 'react-router-dom';

import { ProtectedRoute } from '../components/ProtectedRoute';

import LoginPage from '../pages/LoginPage';
import DashboardPage from '../pages/DashboardPage';
import UsersPage from '../pages/UsersPage';
import EquipmentsPage from '../pages/EquipmentsPage';
import LoansPage from '../pages/LoansPage';
import MaintenancePage from '../pages/MaintenancePage';
import LoanRequestsPage from '../pages/LoanRequestsPage';
import ReportsPage from '../pages/ReportsPage';
import AuditLogsPage from '../pages/AuditLogsPage';
import SettingsPage from '../pages/SettingsPage';
import OperatingHoursPage from '../pages/OperatingHoursPage';


import PublicRegisterPage from '../pages/public/PublicRegisterPage';
import PublicLoginPage from '../pages/public/PublicLoginPage';
import PublicDashboardPage from '../pages/public/PublicDashboardPage';
import PublicEquipmentPage from '../pages/public/PublicEquipmentPage';
import LostReportsPage from '../pages/LostReportsPage';

import PublicForgotPasswordPage from '../pages/public/PublicForgotPasswordPage';
import LoanRenewalsPage from '../pages/LoanRenewalsPage';

export function AppRoutes() {
  return (
    <Routes>
      {/* Públicas */}
      <Route path="/" element={<LoginPage />} />
      <Route
        path="/public/register"
        element={<PublicRegisterPage />}
      />
      <Route
        path="/public/login"
        element={<PublicLoginPage />}
      />
      <Route
        path="/public/forgot-password"
        element={<PublicForgotPasswordPage />}
      />
      <Route
        path="/public/equipment/:id"
        element={<PublicEquipmentPage />}
      />
      <Route
        path="/public/dashboard"
        element={<PublicDashboardPage />}
      />

      {/* Protegidas */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/users"
        element={
          <ProtectedRoute>
            <UsersPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/equipments"
        element={
          <ProtectedRoute>
            <EquipmentsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/loans"
        element={
          <ProtectedRoute>
            <LoansPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/loan-renewals"
        element={
          <ProtectedRoute>
            <LoanRenewalsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/maintenance"
        element={
          <ProtectedRoute>
            <MaintenancePage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/loan-requests"
        element={
          <ProtectedRoute>
            <LoanRequestsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <ReportsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/audit-logs"
        element={
          <ProtectedRoute>
            <AuditLogsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/operating-hours"
        element={
          <ProtectedRoute>
            <OperatingHoursPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/lost-reports"
        element={
          <ProtectedRoute>
            <LostReportsPage />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}