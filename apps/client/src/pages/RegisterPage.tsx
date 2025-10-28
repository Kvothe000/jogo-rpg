import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { MatrixBackground } from '../components/MatrixBackground';

export function RegisterPage() {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [charName, setCharName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const auth = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (pass.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (charName.length < 3) {
      setError('O nome do personagem deve ter no mínimo 3 caracteres.');
      return;
    }

    try {
      await auth.register(email, pass, charName);
      navigate('/game');
    } catch (err: any) {
      console.error('Falha no registro', err);
      const message = err.response?.data?.message || 'Erro ao criar conta. Tente outro email ou nome.';
      setError(message);
    }
  };

  return (
    <div style={{
      position: 'relative', // Para conter o background
      width: '100%',      // Ocupa a largura disponível
      minHeight: '100vh', // Garante altura mínima da viewport
      display: 'flex',      // Usar flexbox
      justifyContent: 'center', // Centralizar card horizontalmente
      alignItems: 'center',  // Tentar centralizar card verticalmente
      padding: '50px 20px',  // Padding para dar espaço (vertical/horizontal)
      boxSizing: 'border-box',
    }}>
      <MatrixBackground /> {/* Deve ficar visível e fixo */}

      <div style={{
        // ... (Estilos básicos do card: border, padding interno, backgroundColor, etc.)
        border: '2px solid var(--color-citadel-accent)',
        padding: '40px 30px',
        backgroundColor: 'var(--color-citadel-primary)',
        color: 'var(--color-citadel-text)',
        borderRadius: '8px',
        boxShadow: '0 0 30px var(--color-citadel-glow)',
        width: '100%',
        maxWidth: '400px', // Ou 450px para Register
        textAlign: 'center',
        position: 'relative', // Manter para zIndex
        zIndex: 1,           // Manter
      }}>
        {/* Efeito de Glitch no título */}
        <div style={{ 
          marginBottom: '30px',
          position: 'relative',
          display: 'inline-block'
        }}>
          <h1 style={{
            color: '#FF00FF',
            fontFamily: "'Orbitron', sans-serif",
            fontSize: '2rem',
            marginBottom: '8px',
            letterSpacing: '2px',
            textShadow: '0 0 10px #FF00FF',
            position: 'relative'
          }}>
            NOVA IDENTIDADE
            <span style={{
              position: 'absolute',
              top: 0,
              left: '2px',
              color: '#00EEFF',
              textShadow: '2px 0 #00EEFF',
              clipPath: 'polygon(0 0, 100% 0, 100% 90%, 0 90%)',
              animation: 'glitch 3s infinite linear alternate-reverse'
            }}>NOVA IDENTIDADE</span>
          </h1>
          <p style={{ 
            color: '#E0E1DD',
            fontSize: '0.9em',
            opacity: 0.8,
            margin: 0
          }}>
            Registro no Sistema da Cidadela
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <h2 style={{
            color: '#FF00FF',
            fontFamily: "'Orbitron', sans-serif",
            textAlign: 'center',
            marginBottom: '25px',
            fontSize: '1.3em',
            textShadow: '0 0 10px #FF00FF'
          }}>
            CRIAR CONTA
          </h2>

          {error && (
            <div style={{
              padding: '12px',
              backgroundColor: 'rgba(220, 53, 69, 0.2)',
              border: '1px solid #dc3545',
              borderRadius: '4px',
              color: '#dc3545',
              marginBottom: '20px',
              fontSize: '0.85em',
              textAlign: 'center'
            }}>
              ⚠️ {error}
            </div>
          )}
          
          <div style={{ marginBottom: '20px', textAlign: 'left' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#E0E1DD',
              fontSize: '0.9em',
              fontWeight: 'bold'
            }}>
              📧 Email:
            </label>
            <input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #415A77',
                borderRadius: '4px',
                backgroundColor: 'rgba(0,0,0,0.4)',
                color: '#E0E1DD',
                fontFamily: "'Courier New', monospace",
                fontSize: '1em',
                boxSizing: 'border-box',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px', textAlign: 'left' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#E0E1DD',
              fontSize: '0.9em',
              fontWeight: 'bold'
            }}>
              🔒 Senha (mín. 6 caracteres):
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #415A77',
                borderRadius: '4px',
                backgroundColor: 'rgba(0,0,0,0.4)',
                color: '#E0E1DD',
                fontFamily: "'Courier New', monospace",
                fontSize: '1em',
                boxSizing: 'border-box',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ marginBottom: '25px', textAlign: 'left' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#E0E1DD',
              fontSize: '0.9em',
              fontWeight: 'bold'
            }}>
              🎭 Nome do Personagem (mín. 3 caracteres):
            </label>
            <input
              type="text"
              placeholder="Seu nome no mundo da Ruptura"
              value={charName}
              onChange={(e) => setCharName(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #415A77',
                borderRadius: '4px',
                backgroundColor: 'rgba(0,0,0,0.4)',
                color: '#E0E1DD',
                fontFamily: "'Courier New', monospace",
                fontSize: '1em',
                boxSizing: 'border-box',
                outline: 'none'
              }}
            />
          </div>

          <button 
            type="submit" 
            style={{
              width: '100%',
              padding: '14px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontFamily: "'Orbitron', sans-serif",
              fontSize: '1em',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              background: 'linear-gradient(135deg, #7209B7 0%, #FF00FF 100%)',
              color: 'white',
              marginBottom: '20px',
              boxShadow: '0 0 20px rgba(255, 0, 255, 0.5)'
            }}
          >
            🎮 CRIAR E ENTRAR
          </button>
        </form>

        <hr style={{ 
          margin: '25px 0', 
          borderColor: '#415A77',
          borderStyle: 'dashed',
          opacity: 0.5
        }}/>

        <p style={{ 
          color: '#E0E1DD',
          fontSize: '0.9em',
          marginBottom: '25px'
        }}>
          Já tem uma identidade?{' '}
          <Link 
            to="/login" 
            style={{
              color: '#00EEFF',
              textDecoration: 'none',
              fontWeight: 'bold'
            }}
          >
            Acesse a Interface aqui!
          </Link>
        </p>

        <div style={{
          padding: '15px',
          backgroundColor: 'rgba(0,0,0,0.4)',
          borderRadius: '4px',
          fontSize: '0.8em',
          color: '#E0E1DD',
          border: '1px solid #17a2b8',
          textAlign: 'left'
        }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', color: '#17a2b8' }}>
            🔮 Iniciando sua Jornada:
          </p>
          <p style={{ margin: 0, fontSize: '0.8em', lineHeight: '1.4' }}>
            Sua identidade será registrada nos arquivos da Cidadela. 
            Ressonantes podem despertar habilidades especiais.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes glitch {
          0% { transform: translate(0); }
          20% { transform: translate(-2px, 2px); }
          40% { transform: translate(-2px, -2px); }
          60% { transform: translate(2px, 2px); }
          80% { transform: translate(2px, -2px); }
          100% { transform: translate(0); }
        }
      `}</style>
    </div>
  );
}