import React from 'react';

interface Quest {
    id: string;
    title: string;
    description: string;
    objectives: any; // JSON
}

interface CharacterQuest {
    id: string;
    status: 'ACTIVE' | 'COMPLETED';
    progress: any; // JSON
    quest: Quest;
}

interface QuestDisplayProps {
    quests: CharacterQuest[];
}

export function QuestDisplay({ quests }: QuestDisplayProps) {
    if (!quests || quests.length === 0) {
        return (
            <div style={{ padding: '10px', color: '#666', fontStyle: 'italic', textAlign: 'center' }}>
                Nenhum objetivo ativo.
            </div>
        );
    }

    return (
        <div className="quest-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {quests.map((cq) => (
                <div key={cq.id} style={{
                    border: '1px solid var(--color-border)',
                    padding: '10px',
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: '4px'
                }}>
                    <h4 style={{ margin: '0 0 5px 0', color: 'var(--color-accent)' }}>{cq.quest.title}</h4>
                    <p style={{ fontSize: '0.9em', color: '#aaa', margin: '0 0 10px 0' }}>{cq.quest.description}</p>

                    {/* Renderizar Objetivos (Simplificado) */}
                    <div style={{ fontSize: '0.85em' }}>
                        <strong>Objetivos:</strong>
                        <ul style={{ paddingLeft: '20px', margin: '5px 0' }}>
                            {renderObjectives(cq.quest.objectives, cq.progress)}
                        </ul>
                    </div>
                </div>
            ))}
        </div>
    );
}

function renderObjectives(objectives: any, progress: any) {
    const items = [];

    if (objectives.interact) {
        const isDone = progress.interacted;
        items.push(
            <li key="interact" style={{ color: isDone ? 'green' : 'inherit' }}>
                {isDone ? '✓ ' : '○ '} Falar com o Mentor
            </li>
        );
    }

    if (objectives.kill) {
        const current = progress.killCount || 0;
        const target = objectives.kill.count;
        const isDone = current >= target;
        items.push(
            <li key="kill" style={{ color: isDone ? 'green' : 'inherit' }}>
                {isDone ? '✓ ' : '○ '} Eliminar Alvos: {current}/{target}
            </li>
        );
    }

    return items;
}
