/**
 * Theme Base Configuration
 * Defines the interface that all themes must implement
 */

const ThemeBase = {
    // Theme metadata
    id: 'base',
    name: 'Base Theme',
    description: 'Base theme template',
    
    // Whether this theme uses image assets or CSS shapes
    useImages: false,
    
    // Asset paths (only used if useImages is true)
    assets: {
        wall: null,           // Wall/barrier image
        path: null,           // Path marker image
        node: null,           // Dead-end node image
        nodeComplete: null,   // Completed node image
        stockpile: null,      // Data stockpile image
        stockpileComplete: null,
        background: null,     // Cell background tile
        gridBackground: null  // Overall grid background
    },
    
    // Color palette - maps to CSS variables
    colors: {
        primary: '#00f3ff',      // Main accent (--neon-cyan)
        secondary: '#5577ff',    // Secondary accent (--neon-blue)
        success: '#00ff9f',      // Success/complete (--neon-green)
        warning: '#ffaa00',      // Warning/highlight (--neon-amber)
        error: '#ff3366',        // Error state (--neon-red)
        accent: '#ff00ff',       // Special accent (--neon-magenta)
        background: '#050506',   // Main background (--bg-black)
        dimTrace: '#444444',     // Dimmed elements
        labelDefault: '#888888', // Default label color (numbers)
        text: '#ffffff'          // Primary text
    },

    // Button color assignments
    buttonColors: {
        default: 'primary',      // Default button color
        action: 'success',       // Fork/action button
        danger: 'error',         // Discard/abort button
        info: 'warning',         // Briefing button
        sound: 'accent'          // Sound toggle
    },

    // Font configuration
    fonts: {
        primary: "'Segoe UI', system-ui, -apple-system, sans-serif",
        mono: "'Courier New', monospace",
        display: "'Courier New', monospace",  // For numbers/labels
        heading: "'Courier New', monospace"   // For titles
    },
    
    // Layer colors (for fork visualization)
    layerColors: ['primary', 'secondary', 'warning', 'accent'],
    
    // Text/terminology
    terminology: {
        // Game title
        title: 'Neural Recon Terminal',

        // Button labels
        newGame: 'Initialize',
        fork: 'Fork',
        commit: 'Commit',
        discard: 'Discard',
        undo: 'Undo',
        briefing: 'Briefing',

        // Layer names
        layerNames: ['Root', 'Fork 1', 'Fork 2', 'Fork 3'],

        // Victory screen
        victoryTitle: 'MISSION COMPLETE',
        victoryStats: {
            time: 'Duration',
            moves: 'Operations',
            streak: 'Consecutive Wins'
        },

        // Briefing terminology
        briefingTitle: 'Mission Briefing',
        wall: 'Wall',
        path: 'Path',
        deadEnd: 'Dead End',
        stockpile: 'Stockpile',
        vault: 'Vault',
        stockpileDesc: 'Located inside a 3×3 vault surrounded by walls with one door.',
        vaultDesc: 'On 6×6+ grids, look for a 3×3 vault with 11 walls around it and 1 door.'
    },
    
    // Flavor text generators
    babble: {
        prefixes: ['System'],
        middles: ['process'],
        suffixes: ['complete'],
        extras: ['Operation successful.']
    },
    
    // Generate random flavor text
    generateBabble() {
        const prefix = this.babble.prefixes[Math.floor(Math.random() * this.babble.prefixes.length)];
        const middle = this.babble.middles[Math.floor(Math.random() * this.babble.middles.length)];
        const suffix = this.babble.suffixes[Math.floor(Math.random() * this.babble.suffixes.length)];
        const extra = this.babble.extras[Math.floor(Math.random() * this.babble.extras.length)];
        return `${prefix}-${middle} ${suffix}. ${extra}`;
    },
    
    // Sound configuration (frequency multipliers, can be overridden)
    sounds: {
        enabled: true,
        pitchMultiplier: 1.0,  // Adjust overall pitch
        waveform: 'square'     // Default oscillator type
    },
    
    // Animation configuration
    animations: {
        victoryWaveDelay: 50,  // ms between cell animations
        pulseSpeed: 1.0,       // Animation speed multiplier
        glowIntensity: 1.0     // Glow effect intensity
    },
    
    // Custom render functions (can be overridden by themes)
    // These return DOM elements or modify existing ones
    
    /**
     * Render a wall element
     * @param {number} layerIndex - Which layer (0-3)
     * @param {boolean} isError - Whether wall is in error state
     * @param {boolean} isCurrent - Whether this is the current layer
     * @returns {HTMLElement}
     */
    renderWall(layerIndex, isError, isCurrent) {
        const wall = document.createElement('div');
        wall.className = `wall wall-l${layerIndex}`;
        if (!isCurrent) wall.classList.add('opacity-40');
        if (isError) wall.classList.add(isCurrent ? 'wall-error' : 'wall-error-dim');
        return wall;
    },
    
    /**
     * Render a path dot element
     * @param {number} layerIndex - Which layer
     * @param {boolean} isCurrent - Whether this is the current layer
     * @param {string} state - 'normal', 'complete', 'error', 'erratic'
     * @returns {HTMLElement}
     */
    renderPathDot(layerIndex, isCurrent, state) {
        const dot = document.createElement('div');
        dot.className = 'path-dot';
        if (!isCurrent) dot.classList.add('path-dot-dim');
        if (state === 'complete') dot.classList.add('path-dot-complete');
        if (state === 'error') dot.classList.add('path-dot-error');
        if (state === 'erratic') dot.classList.add('path-dot-erratic');
        return dot;
    },
    
    /**
     * Render a dead-end node
     * @param {string} state - 'normal', 'complete', 'conflict', 'erratic'
     * @returns {HTMLElement}
     */
    renderNode(state) {
        const node = document.createElement('div');
        node.className = 'node';
        if (state === 'complete') node.classList.add('node-complete');
        if (state === 'conflict') node.classList.add('node-conflict');
        if (state === 'erratic') node.classList.add('node-erratic');
        
        const core = document.createElement('div');
        core.className = 'node-core';
        node.appendChild(core);
        
        return node;
    },
    
    /**
     * Render a stockpile element
     * @param {string} state - 'normal', 'complete', 'retrieved'
     * @returns {HTMLElement}
     */
    renderStockpile(state) {
        const stockpile = document.createElement('div');
        stockpile.className = 'stockpile';
        if (state === 'complete') stockpile.classList.add('stockpile-complete');
        if (state === 'retrieved') stockpile.classList.add('stockpile-retrieved');
        
        const icon = document.createElement('div');
        icon.className = 'stockpile-icon';
        stockpile.appendChild(icon);
        
        return stockpile;
    },
    
    /**
     * Custom victory sequence (can be overridden)
     * @param {Function} defaultSequence - The default victory animation function
     */
    playVictorySequence(defaultSequence) {
        // By default, just run the standard sequence
        defaultSequence();
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeBase;
}

