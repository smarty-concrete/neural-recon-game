/**
 * Garden Theme
 * A peaceful botanical puzzle experience
 */

const ThemeGarden = Object.assign({}, ThemeBase, {
    id: 'garden',
    name: 'Garden',
    description: 'Cultivate your path through the greenhouse',
    
    useImages: true,
    
    assets: {
        wall: 'themes/garden/assets/flower.png',
        wallLayer: [
            'themes/garden/assets/flower-pink.png',
            'themes/garden/assets/flower-purple.png',
            'themes/garden/assets/flower-yellow.png',
            'themes/garden/assets/flower-orange.png'
        ],
        path: 'themes/garden/assets/leaf.png',
        node: 'themes/garden/assets/seedpod.png',
        nodeComplete: 'themes/garden/assets/seedpod-sprouted.png',
        stockpile: 'themes/garden/assets/beehive.png',
        stockpileComplete: 'themes/garden/assets/beehive-golden.png',
        background: null,  // Use CSS background instead
        gridBackground: 'themes/garden/assets/garden-bed.png'
    },
    
    colors: {
        primary: '#ff69b4',      // Hot pink (flowers)
        secondary: '#9370db',    // Medium purple
        success: '#32cd32',      // Lime green (growth)
        warning: '#ffd700',      // Gold (sunshine)
        error: '#ff6347',        // Tomato (wilted)
        accent: '#da70d6',       // Orchid
        background: '#1a2f1a',   // Dark forest green
        dimTrace: '#3d5c3d',     // Muted green
        labelDefault: '#8fbc8f', // Dark sea green - visible on dark green bg
        text: '#f0fff0'          // Honeydew
    },

    buttonColors: {
        default: 'success',      // Green (natural)
        action: 'warning',       // Gold (Branch)
        danger: 'error',         // Tomato (Prune)
        info: 'secondary',       // Purple (Almanac)
        sound: 'accent'          // Orchid
    },

    fonts: {
        primary: "'Georgia', 'Times New Roman', serif",
        mono: "'Georgia', serif",
        display: "'Georgia', serif",           // Elegant serif for numbers
        heading: "'Brush Script MT', 'Georgia', cursive, serif"  // Decorative for titles
    },

    layerColors: ['pink', 'purple', 'gold', 'orchid'],
    
    terminology: {
        title: 'Garden Path Puzzle',
        newGame: 'Plant',
        fork: 'Branch',
        commit: 'Cultivate',
        discard: 'Prune',
        undo: 'Undo',
        briefing: 'Almanac',
        layerNames: ['Seed', 'Branch 1', 'Branch 2', 'Branch 3'],
        victoryTitle: 'GARDEN IN FULL BLOOM!',
        victoryStats: {
            time: 'Growing Time',
            moves: 'Gardening Actions',
            streak: 'Harvest Streak'
        },
        // Briefing terminology
        briefingTitle: 'Garden Almanac',
        wall: 'Flower',
        path: 'Path',
        deadEnd: 'Seedpod',
        stockpile: 'Beehive',
        vault: 'Greenhouse',
        stockpileDesc: 'Located inside a 3×3 greenhouse surrounded by flowers with one entrance. Turns golden when the greenhouse is properly enclosed.',
        vaultDesc: 'On 6×6+ grids, look for a 3×3 greenhouse with 11 flowers around it and 1 entrance. The greenhouse contains a Beehive somewhere inside.'
    },
    
    babble: {
        prefixes: ['Petal', 'Bloom', 'Root', 'Vine', 'Leaf', 'Stem', 'Bud', 'Seed', 'Pollen', 'Nectar'],
        middles: ['growth', 'sprout', 'blossom', 'garden', 'meadow', 'grove', 'bower', 'hedge', 'trellis', 'arbor'],
        suffixes: ['flourishing', 'blooming', 'sprouting', 'thriving', 'blossoming', 'cultivated', 'pollinated', 'harvested', 'ripened', 'germinated'],
        extras: [
            'Photosynthesis complete.',
            'Soil nutrients optimal.',
            'Pollination successful.',
            'Root system established.',
            'Sunlight absorption: 100%',
            'Water levels balanced.',
            'Beneficial insects attracted.',
            'Growth cycle synchronized.',
            'Compost integration complete.',
            'Biodiversity index: Excellent.'
        ]
    },
    
    sounds: {
        enabled: true,
        pitchMultiplier: 1.2,  // Slightly higher, more cheerful
        waveform: 'triangle'   // Softer sound
    },
    
    animations: {
        victoryWaveDelay: 80,   // Slower, more organic
        pulseSpeed: 0.7,        // Gentler pulsing
        glowIntensity: 0.6      // Softer glow
    },
    
    /**
     * Render a wall (flower) element with image
     */
    renderWall(layerIndex, isError, isCurrent) {
        const wall = document.createElement('div');
        wall.className = `wall wall-l${layerIndex} wall-image`;
        if (!isCurrent) wall.classList.add('opacity-40');
        if (isError) wall.classList.add(isCurrent ? 'wall-error' : 'wall-error-dim');
        
        // Use layer-specific flower image if available
        const imgSrc = this.assets.wallLayer?.[layerIndex] || this.assets.wall;
        if (imgSrc) {
            wall.style.backgroundImage = `url('${imgSrc}')`;
            wall.style.backgroundSize = 'contain';
            wall.style.backgroundPosition = 'center';
            wall.style.backgroundRepeat = 'no-repeat';
        }
        
        return wall;
    },
    
    /**
     * Render a path (leaf) element with image
     */
    renderPathDot(layerIndex, isCurrent, state) {
        const dot = document.createElement('div');
        dot.className = 'path-dot path-dot-image';
        if (!isCurrent) dot.classList.add('path-dot-dim');
        if (state === 'complete') dot.classList.add('path-dot-complete');
        if (state === 'error') dot.classList.add('path-dot-error');
        if (state === 'erratic') dot.classList.add('path-dot-erratic');
        
        if (this.assets.path) {
            dot.style.backgroundImage = `url('${this.assets.path}')`;
            dot.style.backgroundSize = 'contain';
            dot.style.backgroundPosition = 'center';
            dot.style.backgroundRepeat = 'no-repeat';
            dot.style.borderRadius = '0';
            dot.style.width = '60%';
            dot.style.height = '60%';
        }
        
        return dot;
    },
    
    /**
     * Render a node (seedpod) element with image
     */
    renderNode(state) {
        const node = document.createElement('div');
        node.className = 'node node-image';
        if (state === 'complete') node.classList.add('node-complete');
        if (state === 'conflict') node.classList.add('node-conflict');
        if (state === 'erratic') node.classList.add('node-erratic');
        
        const imgSrc = state === 'complete' ? this.assets.nodeComplete : this.assets.node;
        if (imgSrc) {
            node.style.backgroundImage = `url('${imgSrc}')`;
            node.style.backgroundSize = 'contain';
            node.style.backgroundPosition = 'center';
            node.style.backgroundRepeat = 'no-repeat';
            node.style.border = 'none';
            node.style.boxShadow = 'none';
        }
        
        // Don't add core for image-based nodes
        return node;
    },
    
    /**
     * Render a stockpile (beehive) element with image
     */
    renderStockpile(state) {
        const stockpile = document.createElement('div');
        stockpile.className = 'stockpile stockpile-image';
        if (state === 'complete') stockpile.classList.add('stockpile-complete');
        if (state === 'retrieved') stockpile.classList.add('stockpile-retrieved');
        
        const imgSrc = (state === 'complete' || state === 'retrieved') 
            ? this.assets.stockpileComplete 
            : this.assets.stockpile;
        if (imgSrc) {
            stockpile.style.backgroundImage = `url('${imgSrc}')`;
            stockpile.style.backgroundSize = 'contain';
            stockpile.style.backgroundPosition = 'center';
            stockpile.style.backgroundRepeat = 'no-repeat';
            stockpile.style.border = 'none';
        }
        
        // Don't add icon for image-based stockpile
        return stockpile;
    },
    
    /**
     * Garden victory sequence - flowers blooming outward
     */
    playVictorySequence(defaultSequence) {
        // For now, use default. Later can add custom bloom animation
        defaultSequence();
    }
});

// Register theme
if (typeof ThemeManager !== 'undefined') {
    ThemeManager.register(ThemeGarden);
}

