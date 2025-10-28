import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { MatrixBackground } from '../components/MatrixBackground';
import toast from 'react-hot-toast';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const auth = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await toast.promise(
      auth.login(email, pass),
      {
        loading: 'A verificar credenciais...',
        success: () => {
          navigate('/game');
          return 'Login bem-sucedido! A entrar...';
        },
        error: 'Email ou senha inválidos!',
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
        maxWidth: '400px',
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
            color: '#00EEFF',
            fontFamily: "'Orbitron', sans-serif",
            fontSize: '2rem',
            marginBottom: '8px',
            letterSpacing: '2px',
            textShadow: '0 0 10px #00EEFF',
            position: 'relative'
          }}>
            ECO DA RUPTURA
            <span style={{
              position: 'absolute',
              top: 0,
              left: '2px',
              color: '#FF00FF',
              textShadow: '2px 0 #FF00FF',
              clipPath: 'polygon(0 0, 100% 0, 100% 90%, 0 90%)',
              animation: 'glitch 3s infinite linear alternate-reverse'
            }}>ECO DA RUPTURA</span>
          </h1>
          <p style={{ 
            color: '#E0E1DD',
            fontSize: '0.9em',
            opacity: 0.8,
            margin: 0
          }}>
            A Saga do Último Ressonante
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <h2 style={{
            color: '#00EEFF',
            fontFamily: "'Orbitron', sans-serif",
            textAlign: 'center',
            marginBottom: '25px',
            fontSize: '1.3em',
            textShadow: '0 0 10px #00EEFF'
          }}>
            ACESSO DA INTERFACE
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

          <div style={{ marginBottom: '25px', textAlign: 'left' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#E0E1DD',
              fontSize: '0.9em',
              fontWeight: 'bold'
            }}>
              🔒 Senha:
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
            🔓 INICIAR SESSÃO
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
          Não tem uma conta?{' '}
          <Link 
            to="/register" 
            style={{
              color: '#00EEFF',
              textDecoration: 'none',
              fontWeight: 'bold'
            }}
          >
            Crie uma identidade aqui!
          </Link>
        </p>

        <div style={{
          padding: '15px',
          backgroundColor: 'rgba(0,0,0,0.4)',
          borderRadius: '4px',
          fontSize: '0.8em',
          color: '#E0E1DD',
          border: '1px solid #ffc107',
          textAlign: 'left'
        }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', color: '#ffc107' }}>
            ⚠️ Aviso da Cidadela:
          </p>
          <p style={{ margin: 0, fontSize: '0.8em', lineHeight: '1.4' }}>
            Todo acesso é monitorado pela Ordem. Ressonantes serão identificados e contidos.
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