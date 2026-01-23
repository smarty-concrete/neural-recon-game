/**
 * Cyberpunk Theme
 * The default neon-noir hacker aesthetic
 */

const ThemeCyberpunk = Object.assign({}, ThemeBase, {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    description: 'Neon-lit neural network infiltration',
    
    useImages: false,
    
    colors: {
        primary: '#00f3ff',      // Cyan
        secondary: '#5577ff',    // Blue
        success: '#00ff9f',      // Green
        warning: '#ffaa00',      // Amber
        error: '#ff3366',        // Red
        accent: '#ff00ff',       // Magenta
        background: '#050506',   // Near-black
        dimTrace: '#444444',
        labelDefault: '#444444', // Gray numbers
        text: '#ffffff'
    },

    buttonColors: {
        default: 'primary',      // Cyan
        action: 'success',       // Green (Fork)
        danger: 'error',         // Red (Discard)
        info: 'warning',         // Amber (Briefing)
        sound: 'accent'          // Magenta
    },

    fonts: {
        primary: "monospace",
        mono: "'Courier New', monospace",
        display: "'Courier New', monospace",
        heading: "'Courier New', monospace"
    },

    layerColors: ['cyan', 'blue', 'amber', 'magenta'],
    
    terminology: {
        title: 'Neural Recon Terminal',
        newGame: 'Initialize',
        fork: 'Fork',
        commit: 'Commit',
        discard: 'Discard',
        undo: 'Undo',
        briefing: 'Briefing',
        layerNames: ['Root', 'Fork 1', 'Fork 2', 'Fork 3'],
        victoryTitle: 'NEURAL LINK RESTORED',
        victoryStats: {
            time: 'Sync Duration',
            moves: 'Node Operations',
            streak: 'Consecutive Links'
        },
        // Briefing terminology
        briefingTitle: 'Mission Briefing',
        wall: 'wall',
        path: 'path',
        deadEnd: 'dead end',
        stockpile: 'Data Cache',
        vault: 'Data Vault',
        stockpileDesc: 'Located inside a 3×3 vault surrounded by walls with one door. Turns green when the vault is properly sealed.',
        vaultDesc: 'On {VAULT_SIZE}+ grids, look for a 3×3 vault with 11 walls around it and 1 door. The vault contains a Data Cache somewhere inside.'
    },
    
    babble: {
        prefixes: ['Quantum', 'Neural', 'Synaptic', 'Crypto', 'Hyper', 'Meta', 'Nano', 'Cyber', 'Proto', 'Flux'],
        middles: ['mesh', 'link', 'sync', 'pulse', 'wave', 'core', 'node', 'grid', 'matrix', 'stream'],
        suffixes: ['initialized', 'calibrated', 'synchronized', 'stabilized', 'verified', 'authenticated', 'decrypted', 'restored', 'optimized', 'aligned'],
        extras: [
            'Buffer overflow contained.',
            'Firewall integrity nominal.',
            'Packet loss: 0.00%',
            'Latency optimized.',
            'Handshake complete.',
            'Checksum verified.',
            'Entropy normalized.',
            'Signal-to-noise ratio optimal.',
            'Bandwidth allocated.',
            'Protocol engaged.'
        ]
    },
    
    sounds: {
        enabled: true,
        pitchMultiplier: 1.0,
        waveform: 'square'
    },
    
    animations: {
        victoryWaveDelay: 50,
        pulseSpeed: 1.0,
        glowIntensity: 1.0
    },
    
    // Cyberpunk uses the default CSS-based rendering from ThemeBase
    // No need to override render methods
    
    /**
     * Cyberpunk victory sequence with scan lines and glitch effects
     */
    playVictorySequence(defaultSequence) {
        defaultSequence();
    }
});

// Register theme
if (typeof ThemeManager !== 'undefined') {
    ThemeManager.register(ThemeCyberpunk);
}

