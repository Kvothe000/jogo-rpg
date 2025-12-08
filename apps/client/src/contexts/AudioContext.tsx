import React, { createContext, useContext, ReactNode } from 'react';
import { AudioManager } from '../managers/AudioManager';

interface AudioContextType {
    playSfx: (key: 'click' | 'hover' | 'attack' | 'hit' | 'crit' | 'error' | 'success' | 'respawn') => void;
    playAmbience: (key: 'drone' | 'combat') => void;
}

const AudioContext = createContext<AudioContextType | null>(null);

export const AudioProvider = ({ children }: { children: ReactNode }) => {
    const audioManager = AudioManager.getInstance();

    const playSfx = (key: 'click' | 'hover' | 'attack' | 'hit' | 'crit' | 'error' | 'success' | 'respawn') => {
        audioManager.playSfx(key);
    };

    const playAmbience = (key: 'drone' | 'combat') => {
        audioManager.playAmbience(key);
    };

    return (
        <AudioContext.Provider value={{ playSfx, playAmbience }}>
            {children}
        </AudioContext.Provider>
    );
};

export const useAudio = () => {
    const context = useContext(AudioContext);
    if (!context) {
        throw new Error('useAudio must be used within an AudioProvider');
    }
    return context;
};
