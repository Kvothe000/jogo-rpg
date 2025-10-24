import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

// A URL do nosso backend (tanto API como WebSocket)
const API_URL = 'http://localhost:3000';

// Definimos o que o nosso contexto irá fornecer
interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

// O 'Provedor' que irá gerir a ligação
export function SocketProvider({ children }: { children: ReactNode }) {
  const { token, isAuthenticated } = useAuth(); // Pegamos o estado do AuthContext
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Este efeito corre sempre que o 'token' ou 'isAuthenticated' mudar

    if (isAuthenticated && token) {
      // Se estamos autenticados, criamos a ligação
      const newSocket = io(API_URL, {
        // Este é o passo crucial:
        // Enviamos o token no 'handshake' da ligação
        extraHeaders: {
          Authorization: `Bearer ${token}`,
        },
      });

      setSocket(newSocket);

      // Ouvintes de eventos do próprio socket
      newSocket.on('connect', () => {
        console.log('✅ Socket Conectado!', newSocket.id);
        setIsConnected(true);
      });

      newSocket.on('disconnect', () => {
        console.log('🔌 Socket Desconectado!');
        setIsConnected(false);
      });

      // Função de limpeza (quando o componente desmontar)
      return () => {
        newSocket.disconnect();
      };
    } else {
      // Se não estamos autenticados (logout), desligamos
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isAuthenticated]); // Dependemos do token e do estado de auth

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

// Hook customizado para facilitar o uso
export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket deve ser usado dentro de um SocketProvider');
  }
  return context;
};
