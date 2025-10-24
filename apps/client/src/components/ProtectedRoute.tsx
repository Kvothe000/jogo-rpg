import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const ProtectedRoute = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    // Redireciona para o login se não estiver logado
    return <Navigate to="/login" replace />;
  }

  // Renderiza a página do jogo (ou o que estiver dentro)
  return <Outlet />;
};