// apps/client/src/components/EffectsDisplay.tsx
import React from 'react';
// Importar o tipo SimplifiedActiveEffect (ajuste o path)
import type { SimplifiedActiveEffect } from '../../../server/src/battle/types/combat.type';

interface EffectsDisplayProps {
  effects: SimplifiedActiveEffect[] | undefined;
  targetName: string; // 'Você' ou nome do monstro
}

// Mapeamento key -> [emoji, cor] (Exemplo)
const effectRepresentation: Record<string, [string, string]> = {
  // Status Negativos (Amarelo/Laranja)
  burning: ['🔥', 'var(--color-warning)'],
  slow: ['🐌', 'var(--color-warning)'],
  rooted: ['⚓', 'var(--color-warning)'],
  blind: ['😵', 'var(--color-warning)'],
  confused: ['❓', 'var(--color-warning)'],
  poison: ['☠️', 'var(--color-warning)'],
  // Debuffs (Laranja/Vermelho claro)
  strength_debuff: ['📉💪', '#ff8c42'], // Laranja
  defense_debuff: ['🛡️❌', '#ff8c42'],
  accuracy_debuff: ['🎯❌', '#ff8c42'],
  evasion_debuff: ['🌬️❌', '#ff8c42'],
  armor_debuff: ['🛡️--', '#ff8c42'], // Exemplo Armor Debuff
  // Buffs (Verde/Ciano)
  strength_buff: ['📈💪', 'var(--color-success)'],
  defense_buff: ['🛡️✅', 'var(--color-success)'],
  evasion_buff: ['🌬️✅', 'var(--color-success)'],
  accuracy_buff: ['🎯✅', 'var(--color-success)'],
  armor_buff: ['🛡️++', 'var(--color-success)'], // Exemplo Armor Buff
  crit_chance_buff: ['✨🎯', 'var(--color-success)'], // Exemplo Crit Buff
  // DoTs/HoTs
  dot: ['🩸', 'var(--color-warning)'], // Genérico
  hot: ['💖', 'var(--color-success)'], // Genérico
  regeneration: ['💖', 'var(--color-success)'],
  // Default
  default: ['✨', 'var(--color-info)'],
};

export function EffectsDisplay({ effects, targetName }: EffectsDisplayProps) {
  if (!effects || effects.length === 0) {
    return null; // Não renderizar nada se não houver efeitos
  }

  return (
    <div style={{
      marginTop: '5px', // Menos margem
      marginBottom: '10px',
      textAlign: 'left',
      fontSize: '0.9em', // Um pouco maior
      lineHeight: '1.6', // Espaçamento vertical se quebrar linha
    }}>
      {/* Remover o nome do alvo daqui? Pode ficar redundante se estiver abaixo do HP */}
      {/* <span style={{ marginRight: '5px', fontWeight: 'bold' }}>{targetName}:</span> */}
      {effects.map((effect, index) => {
        const [icon, color] = effectRepresentation[effect.key] || effectRepresentation.default;
        return (
          <span
            key={`${effect.key}-${index}-${effect.duration}`} // Key mais única
            title={`${effect.key} (${effect.duration} turnos restantes)`}
            style={{
              display: 'inline-flex', // Para alinhar ícone e texto
              alignItems: 'center',
              marginRight: '8px', // Mais espaço
              marginBottom: '4px', // Espaço se quebrar linha
              padding: '3px 6px',
              backgroundColor: 'var(--color-interactive-bg)', // Fundo escuro
              border: `1px solid ${color}`, // Borda com a cor do efeito
              borderRadius: '4px',
              cursor: 'help',
              color: color, // Cor do texto/ícone
              boxShadow: `0 0 5px ${color}33`, // Glow suave com a cor
            }}
          >
            <span style={{ marginRight: '4px', fontSize: '1.1em' }}>{icon}</span> {/* Ícone */}
            <span style={{ fontSize: '0.9em', fontWeight: 'bold' }}>{effect.duration}</span> {/* Duração */}
          </span>
        );
       })}
    </div>
  );
}