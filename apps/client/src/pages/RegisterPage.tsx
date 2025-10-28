import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { MatrixBackground } from '../components/MatrixBackground';
import toast from 'react-hot-toast';

export function RegisterPage() {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [charName, setCharName] = useState('');

  const auth = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validações no frontend
    if (pass.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (charName.length < 3) {
      toast.error('O nome do personagem deve ter no mínimo 3 caracteres.');
      return;
    }

    // Usar toast.promise para feedback
    await toast.promise(
      auth.register(email, pass, charName),
      {
        loading: 'A criar identidade...',
        success: () => {
          navigate('/game');
          return 'Conta criada com sucesso! A entrar...';
        },
        error: (err: any) => {
          console.error('Falha no registro', err);
          return err.response?.data?.message || 'Erro ao criar conta. Tente outro email ou nome.';
        },
      }
    );
  };

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '50px 20px',
      boxSizing: 'border-box',
    }}>
      <MatrixBackground />

      <div style={{
        border: '2px solid var(--color-citadel-accent)',
        padding: '40px 30px',
        backgroundColor: 'var(--color-citadel-primary)',
        color: 'var(--color-citadel-text)',
        borderRadius: '8px',
        boxShadow: '0 0 30px var(--color-citadel-glow)',
        width: '100%',
        maxWidth: '450px',
        textAlign: 'center',
        position: 'relative',
        zIndex: 1,
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