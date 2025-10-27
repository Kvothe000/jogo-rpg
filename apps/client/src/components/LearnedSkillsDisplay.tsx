// apps/client/src/components/LearnedSkillsDisplay.tsx

import React from 'react';
// Importar o tipo LearnedSkillData do backend (ajuste o path se necessário)
import type { LearnedSkillData } from '../../../server/src/game/types/socket-with-auth.type';

interface LearnedSkillsDisplayProps {
  skills: LearnedSkillData[];
}

export function LearnedSkillsDisplay({ skills }: LearnedSkillsDisplayProps) {
  if (!skills || skills.length === 0) {
    return <p style={{ fontStyle: 'italic', color: '#aaa' }}>Nenhuma skill aprendida ainda.</p>;
  }

  return (
    <div>
      <h5>Skills Aprendidas</h5>
      <ul style={{ listStyle: 'none', padding: 0, maxHeight: '200px', overflowY: 'auto' }}>
        {skills.map((skill) => (
          <li key={skill.id} style={{ marginBottom: '10px', borderBottom: '1px dashed #ccc', paddingBottom: '8px' }}>
            <div>
              <strong style={{ color: '#90E0EF' }}>{skill.name}</strong>
              <span style={{ fontSize: '0.8em', marginLeft: '8px' }}>(Custo: {skill.ecoCost} Eco)</span>
            </div>
            <p style={{ fontSize: '0.9em', margin: '2px 0 4px 0', color: '#ddd' }}>
              {skill.description}
            </p>
            <div style={{ fontSize: '0.8em', color: '#aaa' }}>
              (Combinação: {skill.requiredKeywordsData.map(kw => `[${kw.name}]`).join(' + ')})
            </div>
            {/* Futuro: Botão para adicionar à barra de atalhos ou ver detalhes */}
          </li>
        ))}
      </ul>
    </div>
  );
}