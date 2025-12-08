import React from 'react';

interface MiniMapProps {
    exits: Record<string, string>; // direction -> roomId
    npcs: { id: string; name: string }[];
    players: { id: string; name: string }[];
}

export function MiniMap({ exits, npcs, players }: MiniMapProps) {
    const hasExit = (dir: string) => exits && !!exits[dir];

    // Grid Positions:
    // [0,0] [0,1=N] [0,2]
    // [1,0=W] [1,1=C] [1,2=E]
    // [2,0] [2,1=S] [2,2]

    const getExitStyle = (row: number, col: number, isPath: boolean) => ({
        gridRow: row + 1,
        gridColumn: col + 1,
        background: isPath ? 'rgba(0, 255, 255, 0.1)' : 'transparent',
        border: isPath ? '1px solid var(--color-renegade-cyan)' : 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: isPath ? 'var(--color-renegade-cyan)' : 'transparent',
        boxShadow: isPath ? '0 0 5px rgba(0,255,255,0.2)' : 'none',
        transition: 'all 0.3s ease',
        fontSize: '0.8em'
    });

    return (
        <div className="minimap-container">
            <div className="radar-sweep"></div>

            <div className="minimap-grid">
                {/* Row 1 */}
                <div />
                <div style={getExitStyle(0, 1, hasExit('north'))}>{hasExit('north') && 'N'}</div>
                <div />

                {/* Row 2 */}
                <div style={getExitStyle(1, 0, hasExit('west'))}>{hasExit('west') && 'W'}</div>
                <div className="minimap-center">
                    <div className="player-dot"></div>
                    {/* Entity Dots */}
                    {npcs.length > 0 && <div className="entity-dot npc-dot" title={`${npcs.length} NPCs`} />}
                    {players.length > 0 && <div className="entity-dot player-other-dot" title={`${players.length} Operadores`} />}
                </div>
                <div style={getExitStyle(1, 2, hasExit('east'))}>{hasExit('east') && 'E'}</div>

                {/* Row 3 */}
                <div />
                <div style={getExitStyle(2, 1, hasExit('south'))}>{hasExit('south') && 'S'}</div>
                <div />
            </div>

            <div className="minimap-border"></div>
        </div>
    );
}
