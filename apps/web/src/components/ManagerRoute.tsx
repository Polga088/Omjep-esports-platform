import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';

interface ManagerRouteProps {
  children: React.ReactNode;
}

export default function ManagerRoute({ children }: ManagerRouteProps) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user?.role !== 'MANAGER') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
