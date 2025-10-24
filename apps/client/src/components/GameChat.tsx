import { useEffect, useState } from 'react';
import { useSocket } from '../contexts/SocketContext';

// O tipo da mensagem que esperamos receber
interface ChatMessage {
  sender: string;
  message: string;
}

export function GameChat() {
  const { socket } = useSocket();
  const [chatLog, setChatLog] = useState<ChatMessage[]>([]);
  const [messageToSend, setMessageToSend] = useState('');

  // Efeito para "ouvir" novas mensagens do servidor
  useEffect(() => {
    if (!socket) return;

    // Ouvinte para mensagens de chat
    const handleReceiveMessage = (payload: ChatMessage) => {
      setChatLog((prevLog) => [...prevLog, payload]);
    };

    // Ouvinte para mensagens do sistema (ex: "Jogador X entrou")
    const handleServerMessage = (message: string) => {
      setChatLog((prevLog) => [...prevLog, { sender: 'SISTEMA', message }]);
    };

    // Liga os ouvintes
    socket.on('receiveChatMessage', handleReceiveMessage);
    socket.on('serverMessage', handleServerMessage);

    // Função de limpeza (desliga os ouvintes)
    return () => {
      socket.off('receiveChatMessage', handleReceiveMessage);
      socket.off('serverMessage', handleServerMessage);
    };
  }, [socket]); // Roda sempre que o socket mudar

  // Função para enviar uma mensagem
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (socket && messageToSend.trim().length > 0) {
      // Emite o evento que o nosso backend está ouvindo
      socket.emit('sendChatMessage', messageToSend);
      setMessageToSend(''); // Limpa o input
    }
  };

  return (
    <div style={{ border: '1px solid #ccc', padding: '10px' }}>
      {/* O Log de Mensagens */}
      <div
        style={{ height: '300px', overflowY: 'scroll', marginBottom: '10px', border: '1px solid #eee' }}
      >
        {chatLog.map((chat, index) => (
          <div key={index}>
            <strong>{chat.sender}:</strong> {chat.message}
          </div>
        ))}
      </div>

      {/* O Input de Envio */}
      <form onSubmit={handleSendMessage}>
        <input
          type="text"
          value={messageToSend}
          onChange={(e) => setMessageToSend(e.target.value)}
          placeholder="Digite sua mensagem..."
          style={{ width: '80%' }}
        />
        <button type="submit" style={{ width: '19%' }}>Enviar</button>
      </form>
    </div>
  );
}