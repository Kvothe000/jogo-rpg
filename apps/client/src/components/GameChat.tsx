import { useEffect, useState, useRef, useCallback } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';

interface ChatMessage {
  sender: string;
  message: string;
}

export function GameChat() {
  const { socket } = useSocket();
  const { user } = useAuth();
  const [chatLog, setChatLog] = useState<ChatMessage[]>([]);
  const [messageToSend, setMessageToSend] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleReceiveMessage = useCallback((payload: ChatMessage) => {
    setChatLog((prevLog) => [...prevLog, payload]);
    scrollToBottom();
    if (!isExpanded) {
      setHasNewMessage(true);
    }
  }, [isExpanded, scrollToBottom]);

  const handleServerMessage = useCallback((message: string) => {
    setChatLog((prevLog) => [...prevLog, { sender: 'SISTEMA', message }]);
    scrollToBottom();
    if (!isExpanded) {
      setHasNewMessage(true);
    }
  }, [isExpanded, scrollToBottom]);

  useEffect(() => {
    if (!socket) return;

    socket.on('receiveChatMessage', handleReceiveMessage);
    socket.on('serverMessage', handleServerMessage);

    return () => {
      socket.off('receiveChatMessage', handleReceiveMessage);
      socket.off('serverMessage', handleServerMessage);
    };
  }, [socket, handleReceiveMessage, handleServerMessage]);

  useEffect(() => {
    if (isExpanded) {
      scrollToBottom();
    }
  }, [isExpanded, scrollToBottom]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (socket && messageToSend.trim().length > 0) {
      socket.emit('sendChatMessage', messageToSend);
      setMessageToSend('');
    }
  };

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
    if (!isExpanded) {
      setHasNewMessage(false);
      setTimeout(scrollToBottom, 50);
    }
  };

  const chatContainerStyle = {
    position: 'fixed' as const,
    bottom: '70px',
    left: '20px',
    width: 'clamp(300px, 30%, 450px)',
    border: '1px solid var(--color-border)',
    borderRadius: '4px',
    boxShadow: '0 0 10px rgba(0, 255, 255, 0.3)',
    display: 'flex',
    flexDirection: 'column' as const,
    fontFamily: 'var(--font-main)',
    zIndex: 50,
    transition: 'height 0.3s ease, opacity 0.3s ease',
    overflow: 'hidden' as const,
    ...(isExpanded 
      ? {
          height: '300px',
          opacity: 1,
          backgroundColor: 'rgba(0, 15, 20, 0.95)'
        }
      : {
          height: '60px',
          opacity: 0.6
        }
    )
  };

  const toggleButtonStyle = {
    background: 'rgba(0,0,0,0.5)',
    color: 'var(--color-renegade-cyan)',
    border: 'none',
    borderBottom: '1px solid var(--color-border)',
    padding: '5px 10px',
    cursor: 'pointer',
    textAlign: 'left' as const,
    fontSize: '0.8em',
    fontFamily: 'var(--font-main)',
    position: 'relative' as const
  };

  const newMessageIndicatorStyle = {
    position: 'absolute' as const,
    right: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '8px',
    height: '8px',
    backgroundColor: 'var(--color-success)',
    borderRadius: '50%',
    boxShadow: '0 0 8px var(--color-success)'
  };

  return (
    <div
      style={chatContainerStyle}
      onMouseEnter={(e) => {
        if (!isExpanded) {
          e.currentTarget.style.opacity = '1';
        }
      }}
      onMouseLeave={(e) => {
        if (!isExpanded) {
          e.currentTarget.style.opacity = '0.6';
        }
      }}
    >
      {/* Botão para expandir/recolher */}
      <button onClick={handleToggleExpand} style={toggleButtonStyle}>
        {isExpanded ? '▼ Recolher Chat' : `▲ Expandir Chat ${hasNewMessage ? ' (!)' : ''}`}
        {hasNewMessage && !isExpanded && <span style={newMessageIndicatorStyle}></span>}
      </button>

      {/* Área de mensagens (visível apenas quando expandido) */}
      <div
        style={{
          height: isExpanded ? 'calc(100% - 90px)' : '0',
          overflowY: 'scroll' as const,
          padding: isExpanded ? '10px' : '0',
          backgroundColor: 'rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column' as const,
          gap: '8px',
          transition: 'all 0.3s ease'
        }}
      >
        {isExpanded && chatLog.map((chat, index) => (
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
        <div ref={messagesEndRef} />
      </div>

      {/* Input de envio (visível apenas quando expandido) */}
      <form 
        onSubmit={handleSendMessage} 
        style={{
          display: isExpanded ? 'flex' : 'none',
          gap: '8px',
          padding: '8px',
          borderTop: '1px solid var(--color-border)',
          backgroundColor: 'rgba(0,0,0,0.3)'
        }}
      >
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
            backgroundColor: 'rgba(0,0,0,0.5)',
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