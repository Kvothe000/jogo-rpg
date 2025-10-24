import { Routes, Route } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage'; // Crie esta página
import { GamePage } from './pages/GamePage';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <Routes>
      {/* Rotas Públicas */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/" element={<LoginPage />} /> {/* Página inicial */}

      {/* Rota Protegida (Jogo) */}
      <Route path="/game" element={<ProtectedRoute />}>
        <Route index element={<GamePage />} />
      </Route>
    </Routes>
  );
}

export default App;