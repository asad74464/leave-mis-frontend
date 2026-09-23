import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export function ProtectedRoute({ children, adminOnly = false }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    // Avoid a flash-redirect to /login while we're still checking
    // localStorage for an existing session.
    return null;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (adminOnly && user.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  return children;
}
