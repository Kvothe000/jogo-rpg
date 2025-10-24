import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export function RegisterPage() {
  // Usamos três estados para os três campos
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [charName, setCharName] = useState('');

  const [error, setError] = useState<string | null>(null); // Para mostrar erros

  const auth = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); // Limpa erros antigos

    // Validação simples (você pode melhorar isso)
    if (pass.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (charName.length < 3) {
      setError('O nome do personagem deve ter no mínimo 3 caracteres.');
      return;
    }

    try {
      // Chama a função de registro do nosso AuthContext
      await auth.register(email, pass, charName);

      // Se o registro for bem-sucedido, o AuthContext fará o login
      // e nos redirecionará para a página do jogo.
      navigate('/game');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error('Falha no registro', err);

      // Tenta pegar a mensagem de erro da nossa API
      const message = err.response?.data?.message || 'Erro ao criar conta. Tente outro email ou nome.';
      setError(message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Criar Conta</h2>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <input
        type="password"
        placeholder="Senha (mín. 6 caracteres)"
        value={pass}
        onChange={(e) => setPass(e.target.value)}
        required
      />

      <input
        type="text"
        placeholder="Nome do Personagem (mín. 3 caracteres)"
        value={charName}
        onChange={(e) => setCharName(e.target.value)}
        required
      />

      <button type="submit">Criar e Entrar</button>

      {/* Mostra mensagens de erro */}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </form>
  );
}