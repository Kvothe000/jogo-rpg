// apps/client/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { SocketProvider } from './contexts/SocketContext.tsx';
import { Toaster } from 'react-hot-toast'; // <-- 1. Importar o Toaster

import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <App />
          {/* 2. Adicionar o Toaster aqui (pode vir antes ou depois do App) */}
          <Toaster
            position="bottom-right" // Posição (pode escolher top-right, bottom-center, etc.)
            toastOptions={{
              // Estilos base para os toasts (opcional, pode estilizar com CSS também)
              style: {
                background: 'var(--color-interactive-bg)', // Usar cores do nosso tema
                color: 'var(--color-text)',
                border: '1px solid var(--color-border)',
                fontFamily: 'var(--font-main)',
              },
              // Estilos específicos para sucesso e erro
              success: {
                style: {
                  background: 'var(--color-success)', // Ou um verde mais temático
                  color: 'black',
                },
                iconTheme: {
                  primary: 'black',
                  secondary: 'var(--color-success)',
                },
              },
              error: {
                style: {
                  background: 'var(--color-danger)', // Ou um vermelho mais temático
                  color: 'white',
                },
                 iconTheme: {
                  primary: 'white',
                  secondary: 'var(--color-danger)',
                },
              },
            }}
          />
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);