// Importar o tipo KeywordData do backend (verifique o path!)
import type { KeywordData } from '../../../server/src/game/types/socket-with-auth.type'; // <-- Ajuste o path se necessário
import React from 'react'; // Import React

interface KeywordsDisplayProps {
  keywords: KeywordData[];
}

export function KeywordsDisplay({ keywords }: KeywordsDisplayProps) {
  if (!keywords || keywords.length === 0) {
    return <p>Nenhuma Keyword do Eco desperta ainda.</p>;
  }

  return (
    <div style={{ border: '1px solid #415A77', padding: '10px', background: '#0D1B2A', color: '#E0E1DD' }}> {/* Cores da Cidadela */}
      <h4>Keywords do Eco Despertas</h4>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {keywords.map((kw) => (
          <li key={kw.id} style={{ marginBottom: '5px' }}>
            <strong style={{ color: '#FF00FF' }}>[{kw.name}]</strong> {/* Nome com cor vibrante */}
            <p style={{ fontSize: '0.85em', margin: '2px 0 0 10px', color: '#aaa' }}>
              {kw.description}
            </p>
          </li>
        ))}
      </ul>
      {/* Futuro: Interface de combinação de keywords */}
    </div>
  );
}