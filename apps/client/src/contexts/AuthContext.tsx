import {
  createContext,
  type ReactNode,
  useContext,
  useState,
  useEffect,
} from 'react';
import { api } from '../services/api';
import type { UserPayload } from '../../../server/src/auth/types/user-payload.type';

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
  updateProfile: (newUserData: Partial<UserPayload>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserPayload | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('rpg-token');
    if (storedToken) {
      setToken(storedToken);
      api
        .get('/auth/profile')
        .then((response) => {
          setUser(response.data);
        })
        .catch(() => {
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
    await login(email, pass);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('rpg-token');
  };

  const isAuthenticated = !!token && !!user;

  const updateProfile = (newUserData: Partial<UserPayload>) => {
    setUser((prevUser) => {
      if (!prevUser) return null;

      const updatedCharacterData = newUserData.character
        ? {
            ...prevUser.character,
            ...newUserData.character,
            xp: newUserData.character.xp !== undefined
                  ? BigInt(newUserData.character.xp)
                  : prevUser.character?.xp ?? BigInt(0),
          }
        : prevUser.character;

      return {
        ...prevUser,
        ...newUserData,
        character: updatedCharacterData as UserPayload['character'],
      };
    });
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, user, token, login, register, logout, updateProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};