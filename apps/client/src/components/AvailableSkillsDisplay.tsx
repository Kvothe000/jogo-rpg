// apps/client/src/components/AvailableSkillsDisplay.tsx

import React from 'react';
// Importar o tipo AvailableSkillData do backend (ajuste o path se necessário)
import type { AvailableSkillData } from '../../../server/src/game/types/socket-with-auth.type';

interface AvailableSkillsDisplayProps {
  skills: AvailableSkillData[];
  onLearnSkill: (skillId: string) => void; // Função para chamar quando clicar em Aprender
}

export function AvailableSkillsDisplay({ skills, onLearnSkill }: AvailableSkillsDisplayProps) {
  if (!skills || skills.length === 0) {
    return <p style={{ fontStyle: 'italic', color: '#aaa' }}>Nenhuma nova skill disponível para aprender com seus Ecos atuais.</p>;
  }

  return (
    <div>
      <h5>Skills Disponíveis para Aprender</h5>
      <ul style={{ listStyle: 'none', padding: 0, maxHeight: '200px', overflowY: 'auto' }}>
        {skills.map((skill) => (
          <li key={skill.id} style={{ marginBottom: '10px', borderBottom: '1px dashed #ccc', paddingBottom: '8px' }}>
            <div>
              <strong style={{ color: '#00B4D8' }}>{skill.name}</strong>
              <span style={{ fontSize: '0.8em', marginLeft: '8px' }}>(Custo: {skill.ecoCost} Eco)</span>
            </div>
            <p style={{ fontSize: '0.9em', margin: '2px 0 4px 0', color: '#ddd' }}>
              {skill.description}
            </p>
            <div style={{ fontSize: '0.8em', color: '#aaa' }}>
              Requer: {skill.requiredKeywordsData.map(kw => `[${kw.name}]`).join(' + ')}
            </div>
            <button
              onClick={() => onLearnSkill(skill.id)}
              style={{
                marginTop: '5px',
                padding: '4px 8px',
                fontSize: '0.85em',
                background: '#0077B6',
                color: 'white',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Aprender
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}