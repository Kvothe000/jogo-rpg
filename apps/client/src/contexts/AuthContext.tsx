import {
  createContext,
  type ReactNode,
  useContext,
  useState,
  useEffect,
  useCallback,
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
    characterClass: string,
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
    characterClass: string,
  ) => {
    await api.post('/auth/register', {
      email: email,
      password: pass,
      characterName: charName,
      characterClass: characterClass,
    });
    await login(email, pass);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('rpg-token');
  };

  const isAuthenticated = !!token && !!user;

  const updateProfile = useCallback((newUserData: Partial<UserPayload>) => {
    setUser((prevUser) => {
      if (!prevUser) return null;
      // Se não há personagem anterior E não há dados novos de personagem, não faz nada
      if (!prevUser.character && !newUserData.character) return prevUser;

      const nextUser = { ...prevUser };

      if (newUserData.character) {
        const prevCharacter = prevUser.character ?? {} as any;
        // Começa com uma cópia, MAS aplica os novos dados PRIMEIRO
        // para que as propriedades como 'strength' sejam as totais, se vierem
        const nextCharacter = { ...prevCharacter, ...newUserData.character };

        // Garante que o XP é BigInt
        if (newUserData.character.xp !== undefined) {
          nextCharacter.xp = BigInt(newUserData.character.xp);
        }
        
        // Garante que outras propriedades obrigatórias existam (fallbacks)
        nextCharacter.id = nextCharacter.id ?? prevCharacter.id ?? '';
        nextCharacter.name = nextCharacter.name ?? prevCharacter.name ?? '';
        nextCharacter.createdAt = nextCharacter.createdAt ?? prevCharacter.createdAt ?? new Date();
        nextCharacter.mapId = nextCharacter.mapId ?? prevCharacter.mapId ?? '';
        nextCharacter.userId = nextCharacter.userId ?? prevCharacter.userId ?? '';
        nextCharacter.level = nextCharacter.level ?? prevCharacter.level ?? 1;
        nextCharacter.xp = nextCharacter.xp ?? prevCharacter.xp ?? BigInt(0);
        nextCharacter.gold = nextCharacter.gold ?? prevCharacter.gold ?? 0;
        nextCharacter.attributePoints = nextCharacter.attributePoints ?? prevCharacter.attributePoints ?? 0;
        nextCharacter.status = nextCharacter.status ?? prevCharacter.status ?? 'LOCKED';
        nextCharacter.hp = nextCharacter.hp ?? prevCharacter.hp ?? 100;
        nextCharacter.maxHp = nextCharacter.maxHp ?? prevCharacter.maxHp ?? 100;
        nextCharacter.eco = nextCharacter.eco ?? prevCharacter.eco ?? 50;
        nextCharacter.maxEco = nextCharacter.maxEco ?? prevCharacter.maxEco ?? 50;
        nextCharacter.strength = nextCharacter.strength ?? prevCharacter.strength ?? 5;
        nextCharacter.dexterity = nextCharacter.dexterity ?? prevCharacter.dexterity ?? 5;
        nextCharacter.intelligence = nextCharacter.intelligence ?? prevCharacter.intelligence ?? 5;
        nextCharacter.constitution = nextCharacter.constitution ?? prevCharacter.constitution ?? 5;

        nextUser.character = nextCharacter as UserPayload['character'];
      } else if (prevUser.character) {
        nextUser.character = prevUser.character;
      }

      return nextUser as UserPayload;
    });
  }, []);

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