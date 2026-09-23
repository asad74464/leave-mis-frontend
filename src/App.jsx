import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import DashboardPage from '@/pages/DashboardPage';
import RequestsPage from '@/pages/RequestsPage';
import LeaveTypesPage from '@/pages/LeaveTypesPage';
import BalancesPage from '@/pages/BalancesPage';
import NotFoundPage from '@/pages/NotFoundPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/requests"
            element={
              <ProtectedRoute>
                <RequestsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leave-types"
            element={
              <ProtectedRoute>
                <LeaveTypesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/balances"
            element={
              <ProtectedRoute adminOnly>
                <BalancesPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>

      {/* Toasts styled to match the ledger palette rather than sonner's defaults */}
      <Toaster
        position="top-right"
        toastOptions={{
          classNames: {
            toast: 'border border-border bg-card text-card-foreground rounded-md',
            title: 'font-sans text-sm font-medium',
          },
        }}
      />
    </AuthProvider>
  );
}
