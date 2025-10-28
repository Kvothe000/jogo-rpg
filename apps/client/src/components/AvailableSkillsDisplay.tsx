import React from 'react';
import type { AvailableSkillData } from '../../../server/src/game/types/socket-with-auth.type';

interface AvailableSkillsDisplayProps {
  skills: AvailableSkillData[];
  onLearnSkill: (skillId: string) => void;
}

export function AvailableSkillsDisplay({ skills, onLearnSkill }: AvailableSkillsDisplayProps) {
  if (!skills || skills.length === 0) {
    return (
      <p style={{ 
        fontStyle: 'italic', 
        color: 'var(--color-citadel-text)',
        opacity: 0.7,
        textAlign: 'center',
        padding: '10px'
      }}>
        Nenhuma nova skill disponível para aprender com seus Ecos atuais.
      </p>
    );
  }

  return (
    <div>
      <h5 style={{
        color: 'var(--color-renegade-magenta)',
        fontFamily: 'var(--font-display)',
        textShadow: '0 0 5px var(--color-renegade-magenta)',
        marginBottom: '15px',
        fontSize: '1em'
      }}>
        SKILLS DISPONÍVEIS
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
              fontFamily: 'var(--font-main)',
              marginBottom: '8px'
            }}>
              Requer: {skill.requiredKeywordsData.map(kw => 
                `[${kw.name}]`
              ).join(' + ')}
            </div>
            <button
              onClick={() => onLearnSkill(skill.id)}
              style={{
                marginTop: '5px',
                padding: '6px 12px',
                fontSize: '0.8em',
                background: 'linear-gradient(135deg, var(--color-renegade-purple) 0%, var(--color-renegade-magenta) 100%)',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                borderRadius: '4px',
                fontFamily: 'var(--font-main)',
                fontWeight: 'bold',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.boxShadow = '0 0 10px var(--color-renegade-magenta)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              📚 Aprender Skill
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}