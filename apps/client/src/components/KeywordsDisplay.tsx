import React from 'react';
import type { KeywordData } from '../../../server/src/game/types/socket-with-auth.type';

interface KeywordsDisplayProps {
  keywords: KeywordData[];
}

export function KeywordsDisplay({ keywords }: KeywordsDisplayProps) {
  if (!keywords || keywords.length === 0) {
    return (
      <p style={{ 
        color: 'var(--color-citadel-text)',
        fontStyle: 'italic',
        opacity: 0.7,
        textAlign: 'center',
        padding: '15px'
      }}>
        Nenhuma Keyword do Eco desperta ainda.
      </p>
    );
  }

  return (
    <div style={{ 
      border: '1px solid var(--color-border)', 
      padding: '15px', 
      backgroundColor: 'var(--color-citadel-primary)', 
      color: 'var(--color-citadel-text)',
      borderRadius: '4px',
      boxShadow: '0 0 15px var(--color-citadel-glow)'
    }}>
      <h4 style={{
        color: 'var(--color-renegade-cyan)',
        fontFamily: 'var(--font-display)',
        textShadow: '0 0 5px var(--color-renegade-cyan)',
        marginBottom: '15px',
        textAlign: 'center'
      }}>
        KEYWORDS DO ECO
      </h4>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {keywords.map((kw) => (
          <li key={kw.id} style={{ 
            marginBottom: '12px', 
            padding: '10px',
            backgroundColor: 'rgba(0,0,0,0.3)',
            borderRadius: '4px',
            border: '1px solid var(--color-renegade-purple)'
          }}>
            <strong style={{ 
              color: 'var(--color-renegade-magenta)',
              fontSize: '1.1em',
              textShadow: '0 0 5px var(--color-renegade-magenta)'
            }}>[{kw.name}]</strong>
            <p style={{ 
              fontSize: '0.85em', 
              margin: '5px 0 0 0', 
              color: 'var(--color-citadel-text)',
              lineHeight: '1.4'
            }}>
              {kw.description}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}