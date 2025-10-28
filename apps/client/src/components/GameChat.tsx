import { useEffect, useState } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext'; // Importar useAuth

interface ChatMessage {
  sender: string;
  message: string;
}

export function GameChat() {
  const { socket } = useSocket();
  const { user } = useAuth(); // Obter o usuário do contexto de autenticação
  const [chatLog, setChatLog] = useState<ChatMessage[]>([]);
  const [messageToSend, setMessageToSend] = useState('');

  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (payload: ChatMessage) => {
      setChatLog((prevLog) => [...prevLog, payload]);
    };

    const handleServerMessage = (message: string) => {
      setChatLog((prevLog) => [...prevLog, { sender: 'SISTEMA', message }]);
    };

    socket.on('receiveChatMessage', handleReceiveMessage);
    socket.on('serverMessage', handleServerMessage);

    return () => {
      socket.off('receiveChatMessage', handleReceiveMessage);
      socket.off('serverMessage', handleServerMessage);
    };
  }, [socket]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (socket && messageToSend.trim().length > 0) {
      socket.emit('sendChatMessage', messageToSend);
      setMessageToSend('');
    }
  };

  return (
    <div style={{ 
      border: '1px solid var(--color-border)', 
      padding: '15px',
      backgroundColor: 'var(--color-citadel-primary)',
      borderRadius: '4px',
      boxShadow: '0 0 15px var(--color-citadel-glow)'
    }}>
      <h4 style={{
        color: 'var(--color-renegade-cyan)',
        fontFamily: 'var(--font-display)',
        textShadow: '0 0 5px var(--color-renegade-cyan)',
        marginBottom: '15px',
        textAlign: 'center'
      }}>
        CANAL DE COMUNICAÇÃO
      </h4>
      
      {/* Log de Mensagens */}
      <div
        style={{ 
          height: '200px', 
          overflowY: 'scroll', 
          marginBottom: '15px', 
          border: '1px solid var(--color-border)',
          padding: '10px',
          backgroundColor: 'rgba(0,0,0,0.3)',
          borderRadius: '4px',
          fontSize: '0.85em'
        }}
      >
        {chatLog.map((chat, index) => (
          <div key={index} style={{ 
            marginBottom: '8px',
            padding: '5px',
            borderBottom: '1px solid rgba(255,255,255,0.1)'
          }}>
            <strong style={{
              color: chat.sender === 'SISTEMA' ? 'var(--color-warning)' : 
                     chat.sender === user?.character?.name ? 'var(--color-renegade-cyan)' : 'var(--color-info)'
            }}>
              {chat.sender}:
            </strong>{' '}
            <span style={{ color: 'var(--color-citadel-text)' }}>
              {chat.message}
            </span>
          </div>
        ))}
      </div>

      {/* Input de Envio */}
      <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={messageToSend}
          onChange={(e) => setMessageToSend(e.target.value)}
          placeholder="Digite sua mensagem..."
          style={{ 
            flex: 1,
            padding: '8px',
            border: '1px solid var(--color-border)',
            borderRadius: '4px',
            backgroundColor: 'rgba(0,0,0,0.3)',
            color: 'var(--color-citadel-text)',
            fontFamily: 'var(--font-main)',
            fontSize: '0.9em'
          }}
        />
        <button 
          type="submit" 
          style={{ 
            padding: '8px 15px',
            background: 'linear-gradient(135deg, var(--color-renegade-purple) 0%, var(--color-renegade-magenta) 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontFamily: 'var(--font-main)',
            fontSize: '0.9em',
            fontWeight: 'bold'
          }}
        >
          📨 Enviar
        </button>
      </form>
    </div>
  );
}