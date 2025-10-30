import React from 'react';
import ReactDOM from 'react-dom/client';
import  App  from './App.tsx';
import './index.css';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { SocketProvider } from './contexts/SocketContext.tsx';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast'; // <-- IMPORTADO

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <App />
          {/* Toaster Global Estilizado */}
          <Toaster
            position="bottom-right" // Posição correta
            toastOptions={{
              duration: 4000,
              style: {
                background: 'var(--color-renegade-bg-transparent, #0A191F)',
                color: 'var(--color-renegade-text, #E0E0E0)',
                border: '1px solid var(--color-border, #333)',
                fontFamily: 'var(--font-main, sans-serif)',
                boxShadow: '0 0 15px var(--color-renegade-glow, rgba(0,255,255,0.3))',
              },
              success: {
                style: {
                  background: 'rgba(10, 50, 20, 0.9)',
                  borderColor: 'var(--color-success, #0f0)',
                  boxShadow: '0 0 15px var(--color-success-glow, rgba(0,255,0,0.3))',
                },
                iconTheme: { primary: 'var(--color-success, #0f0)', secondary: '#000' },
              },
              error: {
                style: {
                  background: 'rgba(50, 10, 20, 0.9)',
                  borderColor: 'var(--color-danger, #f00)',
                  boxShadow: '0 0 15px var(--color-danger-glow, rgba(255,0,0,0.3))',
                },
                iconTheme: { primary: 'var(--color-danger, #f00)', secondary: '#FFF' },
              },
            }}
          />
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);