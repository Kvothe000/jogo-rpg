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
    // Se não há usuário anterior, não faz nada
    if (!prevUser) return null;
    // Se não há personagem anterior E não há dados novos de personagem, não faz nada
    if (!prevUser.character && !newUserData.character) return prevUser;

    // Começa com uma cópia do usuário anterior
    const nextUser = { ...prevUser };

    // Se há dados de personagem para atualizar
    if (newUserData.character) {
        // Se o usuário anterior não tinha personagem, cria um objeto vazio
        const prevCharacter = prevUser.character ?? {} as Partial<UserPayload['character']>;
        // Começa com uma cópia do personagem anterior
        const nextCharacter = { ...prevCharacter };

        // Aplica atualizações UMA A UMA, garantindo tipos
        if (newUserData.character.xp !== undefined) {
            // Converte a STRING recebida para BigInt para o estado
            nextCharacter.xp = BigInt(newUserData.character.xp);
        }
        if (newUserData.character.gold !== undefined) {
            nextCharacter.gold = newUserData.character.gold; // NUMBER
        }
        if (newUserData.character.level !== undefined) {
            nextCharacter.level = newUserData.character.level; // NUMBER
        }
        if (newUserData.character.hp !== undefined) {
            nextCharacter.hp = newUserData.character.hp; // NUMBER
        }
        if (newUserData.character.maxHp !== undefined) {
            nextCharacter.maxHp = newUserData.character.maxHp; // NUMBER
        }
        if (newUserData.character.eco !== undefined) {
            nextCharacter.eco = newUserData.character.eco; // NUMBER
        }
        if (newUserData.character.maxEco !== undefined) {
            nextCharacter.maxEco = newUserData.character.maxEco; // NUMBER
        }
        // Adicione outras propriedades do Character se precisar atualizar

        // Garante que todas as propriedades OBRIGATÓRIAS existam
        // (Isso é importante se prevCharacter era um objeto vazio)
        nextUser.character = {
            id: nextCharacter.id ?? '', // Use fallbacks se necessário
            name: nextCharacter.name ?? '',
            createdAt: nextCharacter.createdAt ?? new Date(),
            mapId: nextCharacter.mapId ?? '',
            userId: nextCharacter.userId ?? '',
            level: nextCharacter.level ?? 1,
            xp: nextCharacter.xp ?? BigInt(0),
            gold: nextCharacter.gold ?? 0,
            status: nextCharacter.status ?? 'LOCKED', // Use um Enum real se importado
            hp: nextCharacter.hp ?? 100,
            maxHp: nextCharacter.maxHp ?? 100,
            eco: nextCharacter.eco ?? 50,
            maxEco: nextCharacter.maxEco ?? 50,
            strength: nextCharacter.strength ?? 5,
            dexterity: nextCharacter.dexterity ?? 5,
            intelligence: nextCharacter.intelligence ?? 5,
            constitution: nextCharacter.constitution ?? 5,
        };

    } else if (prevUser.character) {
         // Se não há dados novos de personagem, mantém o personagem antigo
         nextUser.character = prevUser.character;
    }


    // Aplica outras atualizações no User (se houver)
    // if (newUserData.email) nextUser.email = newUserData.email;

    // Retorna o novo objeto de estado completo
    return nextUser as UserPayload; // Afirma o tipo final
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