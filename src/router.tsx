import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { LoadingView } from './components/LoadingView';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { IncomesPage } from './pages/IncomesPage';
import { BillsPage } from './pages/BillsPage';
import { SavingGoalsPage } from './pages/SavingGoalsPage';
import { TandasPage } from './pages/TandasPage';
import { CalendarPage } from './pages/CalendarPage';
import { useAuth } from './context/AuthContext';

function ProtectedRoutes() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <LoadingView />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return <AppLayout />;
}

function PublicRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <LoadingView />;
  if (isAuthenticated) return <Navigate to="/" replace />;

  return <>{children}</>;
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/registro" element={<PublicRoute><RegisterPage /></PublicRoute>} />

      <Route element={<ProtectedRoutes />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/ingresos" element={<IncomesPage />} />
        <Route path="/recibos" element={<BillsPage />} />
        <Route path="/ahorros" element={<SavingGoalsPage />} />
        <Route path="/tandas" element={<TandasPage />} />
        <Route path="/calendario" element={<CalendarPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
