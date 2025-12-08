export class AudioManager {
    private static instance: AudioManager;
    private sounds: Map<string, HTMLAudioElement>;
    private volume: number = 0.5;

    private constructor() {
        this.sounds = new Map();
        // Preload sounds (using placeholders or generated urls later)
        // For now we will use simple browser beeps or empty placeholders to avoid 404s until we have assets
    }

    public static getInstance(): AudioManager {
        if (!AudioManager.instance) {
            AudioManager.instance = new AudioManager();
        }
        return AudioManager.instance;
    }

    public playSfx(key: 'click' | 'hover' | 'attack' | 'hit' | 'crit' | 'error' | 'success' | 'respawn') {
        // Placeholder implementation
        // Real implementation would allow multiple overlapping sounds
        console.log(`[Audio] Playing SFX: ${key}`);

        // Simulating sound for prototype feedback
        // In a real app we'd load .mp3/.wav files
    }

    public playAmbience(key: 'drone' | 'combat') {
        console.log(`[Audio] Playing Ambience: ${key}`);
    }

    public setVolume(vol: number) {
        this.volume = Math.max(0, Math.min(1, vol));
    }
}
