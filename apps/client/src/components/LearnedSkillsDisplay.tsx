import React from 'react';
import type { LearnedSkillData } from '../../../server/src/game/types/socket-with-auth.type';

interface LearnedSkillsDisplayProps {
  skills: LearnedSkillData[];
}

export function LearnedSkillsDisplay({ skills }: LearnedSkillsDisplayProps) {
  if (!skills || skills.length === 0) {
    return (
      <p style={{ 
        fontStyle: 'italic', 
        color: 'var(--color-citadel-text)',
        opacity: 0.7,
        textAlign: 'center',
        padding: '10px'
      }}>
        Nenhuma skill aprendida ainda.
      </p>
    );
  }

  return (
    <div>
      <h5 style={{
        color: 'var(--color-renegade-cyan)',
        fontFamily: 'var(--font-display)',
        textShadow: '0 0 5px var(--color-renegade-cyan)',
        marginBottom: '15px',
        fontSize: '1em'
      }}>
        SKILLS APRENDIDAS
      </h5>
      <ul style={{ 
        listStyle: 'none', 
        padding: 0, 
        maxHeight: '200px', 
        overflowY: 'auto',
        border: '1px solid var(--color-border)',
        borderRadius: '4px',
        backgroundColor: 'rgba(0,0,0,0.3)'
      }}>
        {skills.map((skill) => (
          <li key={skill.id} style={{ 
            marginBottom: '10px', 
            borderBottom: '1px dashed var(--color-border)', 
            padding: '10px',
            transition: 'all 0.3s ease'
          }}>
            <div>
              <strong style={{ 
                color: 'var(--color-renegade-cyan)',
                fontSize: '0.95em'
              }}>{skill.name}</strong>
              <span style={{ 
                fontSize: '0.8em', 
                marginLeft: '8px',
                color: 'var(--color-renegade-magenta)'
              }}>(Custo: {skill.ecoCost} ⚡)</span>
            </div>
            <p style={{ 
              fontSize: '0.85em', 
              margin: '4px 0 6px 0', 
              color: 'var(--color-citadel-text)',
              lineHeight: '1.3'
            }}>
              {skill.description}
            </p>
            <div style={{ 
              fontSize: '0.75em', 
              color: 'var(--color-citadel-accent)',
              fontFamily: 'var(--font-main)'
            }}>
              Combinação: {skill.requiredKeywordsData.map(kw => 
                `[${kw.name}]`
              ).join(' + ')}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}