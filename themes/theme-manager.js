/**
 * Theme Manager
 * Handles theme registration, switching, and persistence
 */

const ThemeManager = (() => {
    const themes = {};
    let currentTheme = null;
    let onThemeChangeCallbacks = [];
    
    return {
        /**
         * Register a theme
         * @param {Object} theme - Theme object following ThemeBase structure
         */
        register(theme) {
            if (!theme.id) {
                console.error('Theme must have an id');
                return;
            }
            themes[theme.id] = theme;
            console.log(`Theme registered: ${theme.id}`);
        },
        
        /**
         * Get all registered themes
         * @returns {Object} Map of theme id to theme object
         */
        getAll() {
            return { ...themes };
        },
        
        /**
         * Get list of theme options for UI
         * @returns {Array} Array of {id, name, description}
         */
        getOptions() {
            return Object.values(themes).map(t => ({
                id: t.id,
                name: t.name,
                description: t.description
            }));
        },
        
        /**
         * Get current active theme
         * @returns {Object} Current theme object
         */
        current() {
            return currentTheme;
        },
        
        /**
         * Set the active theme
         * @param {string} themeId - ID of theme to activate
         * @returns {boolean} Success
         */
        set(themeId) {
            const theme = themes[themeId];
            if (!theme) {
                console.error(`Theme not found: ${themeId}`);
                return false;
            }
            
            const previousTheme = currentTheme;
            currentTheme = theme;
            
            // Apply CSS variables
            this.applyCSSVariables(theme);
            
            // Update body class
            document.body.classList.remove(...Object.keys(themes).map(id => `theme-${id}`));
            document.body.classList.add(`theme-${themeId}`);
            
            // Save preference
            try {
                localStorage.setItem('gameTheme', themeId);
            } catch (e) {
                console.warn('Could not save theme preference:', e);
            }
            
            // Notify listeners
            onThemeChangeCallbacks.forEach(cb => cb(theme, previousTheme));
            
            console.log(`Theme activated: ${theme.name}`);
            return true;
        },
        
        /**
         * Apply theme colors as CSS custom properties
         * @param {Object} theme - Theme object
         */
        applyCSSVariables(theme) {
            const root = document.documentElement;
            const colors = theme.colors;

            // Map theme colors to CSS variables
            root.style.setProperty('--neon-cyan', colors.primary);
            root.style.setProperty('--neon-blue', colors.secondary);
            root.style.setProperty('--neon-green', colors.success);
            root.style.setProperty('--neon-amber', colors.warning);
            root.style.setProperty('--neon-red', colors.error);
            root.style.setProperty('--neon-magenta', colors.accent);
            root.style.setProperty('--bg-black', colors.background);
            root.style.setProperty('--dim-trace', colors.dimTrace);
            root.style.setProperty('--label-default', colors.labelDefault || '#888888');

            // Set theme-specific layer colors
            if (theme.layerColors) {
                theme.layerColors.forEach((color, i) => {
                    root.style.setProperty(`--layer-${i}-color`, `var(--neon-${color}, ${colors.primary})`);
                });
            }

            // Apply button colors
            if (theme.buttonColors) {
                const bc = theme.buttonColors;
                root.style.setProperty('--btn-default-color', colors[bc.default] || colors.primary);
                root.style.setProperty('--btn-action-color', colors[bc.action] || colors.success);
                root.style.setProperty('--btn-danger-color', colors[bc.danger] || colors.error);
                root.style.setProperty('--btn-info-color', colors[bc.info] || colors.warning);
                root.style.setProperty('--btn-sound-color', colors[bc.sound] || colors.accent);
            }

            // Apply fonts
            if (theme.fonts) {
                root.style.setProperty('--font-primary', theme.fonts.primary);
                root.style.setProperty('--font-mono', theme.fonts.mono);
                root.style.setProperty('--font-display', theme.fonts.display);
                root.style.setProperty('--font-heading', theme.fonts.heading);
            }
        },
        
        /**
         * Load saved theme or default
         * @param {string} defaultThemeId - Fallback theme ID
         */
        loadSaved(defaultThemeId = 'cyberpunk') {
            let savedId = defaultThemeId;
            try {
                savedId = localStorage.getItem('gameTheme') || defaultThemeId;
            } catch (e) {
                console.warn('Could not load theme preference:', e);
            }
            
            // If saved theme doesn't exist, use default
            if (!themes[savedId]) {
                savedId = defaultThemeId;
            }
            
            this.set(savedId);
        },
        
        /**
         * Register callback for theme changes
         * @param {Function} callback - Function(newTheme, oldTheme)
         */
        onChange(callback) {
            onThemeChangeCallbacks.push(callback);
        },
        
        /**
         * Helper to get a color from current theme
         * @param {string} colorKey - Key from theme.colors
         * @returns {string} Color value
         */
        getColor(colorKey) {
            return currentTheme?.colors?.[colorKey] || '#ffffff';
        },
        
        /**
         * Helper to get terminology from current theme
         * @param {string} key - Key from theme.terminology
         * @returns {string} Text value
         */
        getText(key) {
            return currentTheme?.terminology?.[key] || key;
        },
        
        /**
         * Generate flavor text using current theme
         * @returns {string} Random flavor text
         */
        generateBabble() {
            if (currentTheme?.generateBabble) {
                return currentTheme.generateBabble();
            }
            return 'Complete.';
        },
        
        /**
         * Get render function from current theme
         * Falls back to ThemeBase if not defined
         */
        render: {
            wall(layerIndex, isError, isCurrent) {
                const theme = ThemeManager.current() || ThemeBase;
                return theme.renderWall(layerIndex, isError, isCurrent);
            },
            pathDot(layerIndex, isCurrent, state) {
                const theme = ThemeManager.current() || ThemeBase;
                return theme.renderPathDot(layerIndex, isCurrent, state);
            },
            node(state) {
                const theme = ThemeManager.current() || ThemeBase;
                return theme.renderNode(state);
            },
            stockpile(state) {
                const theme = ThemeManager.current() || ThemeBase;
                return theme.renderStockpile(state);
            }
        }
    };
})();

