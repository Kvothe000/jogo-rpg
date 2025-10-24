import {
  createContext,
  ReactNode,
  useContext,
  useState,
  useEffect,
} from 'react';
import { api } from '../services/api';
import type { UserPayload } from '../../../server/src/auth/types/user-payload.type';

// O que o nosso contexto vai fornecer
interface AuthContextType {
  isAuthenticated: boolean;
  user: UserPayload | null;
  token: string | null;
  login: (email: string, pass: string) => Promise<void>;
  register: (
    email: string,
    pass: string,
    charName: string,
  ) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// O 'Provedor'
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserPayload | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Efeito para carregar o token do localStorage ao iniciar
  useEffect(() => {
    const storedToken = localStorage.getItem('rpg-token');
    if (storedToken) {
      setToken(storedToken);
      // Buscar os dados do usuário
      api
        .get('/auth/profile') // O token é adicionado pelo interceptor
        .then((response) => {
          setUser(response.data);
        })
        .catch(() => {
          // Token inválido, limpe
          localStorage.removeItem('rpg-token');
          setToken(null);
        });
    }
  }, []);

  const login = async (email: string, pass: string) => {
    const response = await api.post('/auth/login', { email, password: pass });
    const { access_token } = response.data;

    setToken(access_token);
    localStorage.setItem('rpg-token', access_token);

    // Buscar dados do usuário após o login
    const profileResponse = await api.get('/auth/profile');
    setUser(profileResponse.data);
  };

  const register = async (
    email: string,
    pass: string,
    charName: string,
  ) => {
    await api.post('/auth/register', {
      email: email,
      password: pass,
      characterName: charName,
    });
    // Após registrar, faz login automaticamente
    await login(email, pass);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('rpg-token');
  };

  const isAuthenticated = !!token && !!user;

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, user, token, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Hook customizado para facilitar o uso
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};