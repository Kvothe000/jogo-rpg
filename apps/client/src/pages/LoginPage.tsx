import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom'; // 1. IMPORTE O 'Link'

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const auth = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await auth.login(email, pass);
      navigate('/game'); // Redireciona para o jogo
    } catch (err) {
      console.error('Falha no login', err);
      alert('Email ou senha inválidos!');
    }
  };

  return (
    <div> {/* 2. É bom envolver tudo em uma <div> */}
      <form onSubmit={handleSubmit}>
        <h2>Login</h2>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Senha"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
        />
        <button type="submit">Entrar</button>
      </form>

      <hr />

      {/* 3. ADICIONE O LINK AQUI */}
      <p>
        Não tem uma conta?{' '}
        <Link to="/register">Crie uma aqui!</Link>
      </p>
    </div>
  );
}