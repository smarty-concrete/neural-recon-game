// GLOBAL FIX: Prevent double-tap zoom via JS for environments that don't respect CSS 'manipulation'
document.addEventListener('dblclick', function(e) {
    e.preventDefault();
}, { passive: false });

// ============================================
// CHIP-TUNE SOUND SYSTEM
// ============================================
const ChipSound = (() => {
    let audioCtx = null;
    let isMuted = false;

    // Initialize audio context on first user interaction
    function initAudio() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        return audioCtx;
    }

    // Create a basic oscillator with envelope
    function playTone(freq, duration, type = 'square', volume = 0.15, attack = 0.01, decay = 0.1) {
        if (isMuted) return;
        const ctx = initAudio();
        if (!ctx) return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + attack);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration);
    }

    // Play a sequence of notes (arpeggio)
    function playArpeggio(notes, noteDuration = 0.08, type = 'square', volume = 0.12) {
        if (isMuted) return;
        const ctx = initAudio();
        if (!ctx) return;

        notes.forEach((freq, i) => {
            setTimeout(() => {
                playTone(freq, noteDuration * 1.5, type, volume);
            }, i * noteDuration * 1000);
        });
    }

    // Frequency slide (for swoosh effects)
    function playSlide(startFreq, endFreq, duration, type = 'square', volume = 0.12) {
        if (isMuted) return;
        const ctx = initAudio();
        if (!ctx) return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + duration);

        gain.gain.setValueAtTime(volume, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration);
    }

    // Noise burst (for percussive sounds)
    function playNoise(duration, volume = 0.1) {
        if (isMuted) return;
        const ctx = initAudio();
        if (!ctx) return;

        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        noise.buffer = buffer;
        filter.type = 'highpass';
        filter.frequency.value = 1000;

        gain.gain.setValueAtTime(volume, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        noise.start(ctx.currentTime);
    }

    // ============================================
    // SOUND EFFECTS
    // ============================================

    return {
        // Wall placement - soft subtle click
        wall: () => {
            playTone(180, 0.05, 'triangle', 0.06);
        },

        // Path placement - soft higher tone
        path: () => {
            playTone(320, 0.05, 'triangle', 0.06);
        },

        // Erase - subtle descending tone
        erase: () => {
            playSlide(280, 140, 0.06, 'triangle', 0.05);
        },

        // Error/invalid - buzzer
        error: () => {
            playTone(110, 0.15, 'sawtooth', 0.15);
            setTimeout(() => playTone(90, 0.15, 'sawtooth', 0.12), 100);
        },

        // Victory fanfare - ascending arpeggio
        victory: () => {
            const notes = [262, 330, 392, 523, 659, 784, 1047]; // C major scale up
            playArpeggio(notes, 0.1, 'square', 0.15);
            setTimeout(() => {
                playArpeggio([1047, 1319, 1568], 0.15, 'triangle', 0.12);
            }, 700);
        },

        // Fork - ascending sweep
        fork: () => {
            playSlide(200, 800, 0.15, 'square', 0.12);
            setTimeout(() => playTone(800, 0.1, 'triangle', 0.1), 100);
        },

        // Commit - satisfying confirmation
        commit: () => {
            playTone(523, 0.08, 'square', 0.12);
            setTimeout(() => playTone(659, 0.08, 'square', 0.12), 60);
            setTimeout(() => playTone(784, 0.12, 'triangle', 0.15), 120);
        },

        // Abort/Discard - descending
        abort: () => {
            playSlide(600, 200, 0.2, 'sawtooth', 0.1);
        },

        // Label click (auto-fill row/col) - sweep
        labelFill: () => {
            playSlide(300, 600, 0.1, 'triangle', 0.1);
            playNoise(0.05, 0.05);
        },

        // Dead end auto-complete
        autoComplete: () => {
            playTone(392, 0.06, 'square', 0.1);
            setTimeout(() => playTone(523, 0.08, 'triangle', 0.12), 50);
        },

        // New game / Initialize
        newGame: () => {
            playSlide(800, 200, 0.15, 'square', 0.1);
            setTimeout(() => playSlide(200, 600, 0.2, 'triangle', 0.12), 150);
        },

        // Undo
        undo: () => {
            playSlide(500, 300, 0.1, 'triangle', 0.1);
        },

        // UI click (generic button)
        click: () => {
            playTone(660, 0.05, 'square', 0.08);
        },

        // Toggle mute state
        toggleMute: () => {
            isMuted = !isMuted;
            return isMuted;
        },

        // Get mute state
        getMuted: () => isMuted,

        // Set mute state
        setMuted: (muted) => { isMuted = muted; },

        // Initialize (call on first user interaction)
        init: initAudio
    };
})();

// ============================================
// CHIPTUNE BACKGROUND MUSIC SYSTEM
// ============================================
const ChipMusic = (() => {
    let audioCtx = null;
    let isPlaying = false;
    let isMuted = false;
    let masterGain = null;
    let schedulerInterval = null;
    let nextNoteTime = 0;
    const scheduleAheadTime = 0.1; // seconds to schedule ahead
    const tempo = 75; // BPM - mellow pace
    const secondsPerBeat = 60.0 / tempo;

    // Musical scales and patterns
    const scale = [
        130.81, // C3
        146.83, // D3
        164.81, // E3
        196.00, // G3
        220.00, // A3
        261.63, // C4
        293.66, // D4
        329.63, // E4
        392.00, // G4
        440.00, // A4
    ]; // C major pentatonic across 2 octaves

    // Chord progressions (indices into scale)
    const chordProgressions = [
        [0, 2, 4],    // C major-ish
        [1, 3, 5],    // D minor-ish
        [4, 6, 8],    // A minor-ish
        [3, 5, 7],    // G major-ish
    ];

    // Bass pattern (scale indices)
    const bassPattern = [0, 0, 3, 3, 4, 4, 3, 3];

    // Arpeggio patterns
    const arpPatterns = [
        [0, 2, 4, 2],
        [0, 4, 2, 4],
        [4, 2, 0, 2],
    ];

    let currentBeat = 0;
    let currentBar = 0;
    let currentChordIdx = 0;
    let currentArpPattern = 0;

    function initAudio() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            masterGain = audioCtx.createGain();
            masterGain.gain.value = 0.15; // Low volume for background music
            masterGain.connect(audioCtx.destination);
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        return audioCtx;
    }

    function playNote(freq, time, duration, type = 'triangle', volume = 0.3) {
        if (!audioCtx || isMuted) return;

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, time);

        // Soft envelope
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(volume, time + 0.02);
        gain.gain.setValueAtTime(volume * 0.7, time + duration * 0.3);
        gain.gain.linearRampToValueAtTime(0, time + duration);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start(time);
        osc.stop(time + duration);
    }

    function playBass(time) {
        const noteIdx = bassPattern[currentBeat % bassPattern.length];
        const freq = scale[noteIdx] / 2; // One octave lower
        playNote(freq, time, secondsPerBeat * 0.8, 'triangle', 0.4);
    }

    function playArpeggio(time) {
        const chord = chordProgressions[currentChordIdx];
        const arpPattern = arpPatterns[currentArpPattern];
        const arpIdx = currentBeat % arpPattern.length;
        const noteInChord = arpPattern[arpIdx] % chord.length;
        const scaleIdx = chord[noteInChord];
        const freq = scale[scaleIdx];
        playNote(freq, time, secondsPerBeat * 0.4, 'square', 0.15);
    }

    function playPad(time) {
        // Play soft pad chord on beat 0 of each bar
        if (currentBeat !== 0) return;

        const chord = chordProgressions[currentChordIdx];
        chord.forEach((scaleIdx, i) => {
            const freq = scale[scaleIdx];
            // Stagger slightly for richness
            playNote(freq, time + i * 0.02, secondsPerBeat * 3.5, 'sine', 0.12);
        });
    }

    function scheduleNote() {
        // Play different elements
        playBass(nextNoteTime);
        playArpeggio(nextNoteTime);
        playPad(nextNoteTime);

        // Advance time
        nextNoteTime += secondsPerBeat / 2; // 8th notes
        currentBeat = (currentBeat + 1) % 8;

        // Change chord every bar
        if (currentBeat === 0) {
            currentBar++;
            currentChordIdx = (currentChordIdx + 1) % chordProgressions.length;

            // Occasionally change arp pattern
            if (currentBar % 4 === 0) {
                currentArpPattern = Math.floor(Math.random() * arpPatterns.length);
            }
        }
    }

    function scheduler() {
        while (nextNoteTime < audioCtx.currentTime + scheduleAheadTime) {
            scheduleNote();
        }
    }

    return {
        start: () => {
            if (isPlaying) return;
            initAudio();
            if (!audioCtx) return;

            isPlaying = true;
            nextNoteTime = audioCtx.currentTime;
            currentBeat = 0;
            currentBar = 0;
            currentChordIdx = 0;

            schedulerInterval = setInterval(scheduler, 25);
        },

        stop: () => {
            if (!isPlaying) return;
            isPlaying = false;
            if (schedulerInterval) {
                clearInterval(schedulerInterval);
                schedulerInterval = null;
            }
        },

        toggle: () => {
            if (isPlaying) {
                ChipMusic.stop();
            } else {
                ChipMusic.start();
            }
            return isPlaying;
        },

        isPlaying: () => isPlaying,

        setVolume: (vol) => {
            if (masterGain) {
                masterGain.gain.value = Math.max(0, Math.min(1, vol));
            }
        },

        mute: () => {
            isMuted = true;
            if (masterGain) masterGain.gain.value = 0;
        },

        unmute: () => {
            isMuted = false;
            if (masterGain) masterGain.gain.value = 0.15;
        },

        setMuted: (muted) => {
            isMuted = muted;
            if (masterGain) masterGain.gain.value = muted ? 0 : 0.15;
        }
    };
})();

// Animation sync: track page load time to keep animations in phase
const pageLoadTime = Date.now();
function getAnimationDelay() {
    // Returns negative delay to sync animations to page load time
    return `-${(Date.now() - pageLoadTime) % 100000}ms`;
}
function setAnimationDelay(element) {
    // Set CSS custom property for animation delay
    element.style.setProperty('--anim-delay', getAnimationDelay());
}

let SIZE = 8;
let solution = [];
let layers = [];
let currentIdx = 0;
let targets = { r: [], c: [] };
let forkAnchors = [null, null, null, null];
let stockpilePos = null; // {r, c} position of data stockpile, or null if none
let isWon = false;
let showKey = false;
let undoState = null; // Single undo state: {layers, currentIdx, forkAnchors}

// Seeded random number generator (Mulberry32)
let currentSeed = null;
let seedHistory = []; // Last several seeds
const MAX_SEED_HISTORY = 5;

function mulberry32(seed) {
    return function() {
        let t = seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

let seededRandom = Math.random; // Default to Math.random

function generateSeed() {
    // Generate a 6-character alphanumeric seed
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid confusing chars like 0/O, 1/I
    let seed = '';
    for (let i = 0; i < 6; i++) {
        seed += chars[Math.floor(Math.random() * chars.length)];
    }
    return seed;
}

function seedToNumber(seed) {
    // Convert alphanumeric seed to a number for the RNG
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = ((hash << 5) - hash) + seed.charCodeAt(i);
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
}

function setSeed(seed) {
    currentSeed = seed.toUpperCase();
    seededRandom = mulberry32(seedToNumber(currentSeed));
    updateSeedDisplay();
}

function addToSeedHistory(seed) {
    // Don't add duplicates
    seedHistory = seedHistory.filter(s => s !== seed);
    seedHistory.unshift(seed);
    if (seedHistory.length > MAX_SEED_HISTORY) {
        seedHistory.pop();
    }
    updateSeedHistoryDisplay();
}

function updateSeedDisplay() {
    const el = document.getElementById('currentSeed');
    if (el) el.textContent = currentSeed || '------';
}

function updateSeedHistoryDisplay() {
    const container = document.getElementById('seedHistory');
    if (!container) return;
    container.innerHTML = '';
    seedHistory.slice(1).forEach(seed => { // Skip current seed (index 0)
        const item = document.createElement('span');
        item.className = 'seed-history-item';
        item.textContent = seed;
        item.onclick = () => {
            document.getElementById('seedInput').value = seed;
        };
        container.appendChild(item);
    });
}

// Assist mode settings - hierarchical toggle system
const assistSettings = {
    enabled: true,           // Master toggle
    visualHints: {
        enabled: true,       // All visual hints
        errorIndicators: true,    // Red X on invalid cells, red traces/dots for 2x2 clumps
        progressIndicators: true  // Green/blue/cyan completion indicators
    },
    autoFill: {
        enabled: true,       // All auto-fill features
        deadEndFill: true,   // Auto-fill neighbors when clicking dead-ends
        wallCompletion: true,  // Auto-complete paths when walls are done (green headers)
        pathCompletion: false  // Auto-complete walls when paths are done (blue headers) - off by default, very powerful
    }
};

// Helper functions to check assist settings
function isErrorIndicatorsEnabled() {
    return assistSettings.enabled && assistSettings.visualHints.enabled && assistSettings.visualHints.errorIndicators;
}
function isProgressIndicatorsEnabled() {
    return assistSettings.enabled && assistSettings.visualHints.enabled && assistSettings.visualHints.progressIndicators;
}
function isDeadEndFillEnabled() {
    return assistSettings.enabled && assistSettings.autoFill.enabled && assistSettings.autoFill.deadEndFill;
}
function isWallCompletionEnabled() {
    return assistSettings.enabled && assistSettings.autoFill.enabled && assistSettings.autoFill.wallCompletion;
}
function isPathCompletionEnabled() {
    return assistSettings.enabled && assistSettings.autoFill.enabled && assistSettings.autoFill.pathCompletion;
}

function saveUndoState() {
    undoState = {
        layers: layers.map(l => [...l]),
        currentIdx: currentIdx,
        forkAnchors: [...forkAnchors]
    };
    document.getElementById('undoBtn').disabled = false;
}

function undo() {
    if (undoState === null || isWon) return;
    ChipSound.undo();
    layers = undoState.layers;
    currentIdx = undoState.currentIdx;
    forkAnchors = undoState.forkAnchors;
    undoState = null;
    document.getElementById('undoBtn').disabled = true;
    updateButtonStates();
    update();
}

// Layer colors - will be updated by theme system
let colors = ["cyan", "blue", "amber", "magenta"];

function updateButtonStates() {
    document.getElementById('commitBtn').disabled = currentIdx === 0;
    document.getElementById('discardBtn').disabled = currentIdx === 0;
    document.getElementById('addLayerBtn').disabled = currentIdx >= 3;

    // Use theme terminology for layer names
    const theme = typeof ThemeManager !== 'undefined' ? ThemeManager.current() : null;
    const layerNames = theme?.terminology?.layerNames || ['Root', 'Fork 1', 'Fork 2', 'Fork 3'];
    document.getElementById('layerName').innerText = layerNames[currentIdx] || `Layer ${currentIdx}`;
    document.getElementById('layerName').style.color = `var(--neon-${colors[currentIdx]})`;

    // Update button labels from theme
    if (theme?.terminology) {
        const t = theme.terminology;
        if (t.fork) document.getElementById('addLayerBtn').textContent = t.fork;
        if (t.commit) document.getElementById('commitBtn').textContent = t.commit;
        if (t.discard) document.getElementById('discardBtn').textContent = t.discard;
        if (t.undo) document.getElementById('undoBtn').textContent = t.undo;
        if (t.newGame) document.getElementById('newMazeBtn').textContent = t.newGame;
        if (t.briefing) document.getElementById('briefingBtn').textContent = t.briefing;
    }
}

let isDragging = false;
let dragMode = null;
let dragStartIdx = null;      // Index where drag started
let dragStartVal = null;      // Value at drag start (0, 1, or 2)
let dragPendingToggle = false; // True if we started on wall/path and haven't moved yet
let dragToggleMode = false;   // True if we're in "toggle same type" mode

// Drawing mode: 'wall', 'path', 'erase', or 'smart'
let drawingMode = 'smart';

// Stats tracking
let gameStartTime = null;
let elapsedTimeBeforePause = 0; // Accumulated time from previous sessions
let moveCount = 0;
let winStreak = 0;

// ============================================
// PERSISTENT PLAYER STATS (Cookie-based)
// ============================================
const PlayerStats = (() => {
    const COOKIE_NAME = 'neuralReconStats';
    const COOKIE_DAYS = 365 * 5; // 5 years

    const defaultStats = {
        totalWins: 0,
        totalTimePlayed: 0,  // milliseconds
        totalMoves: 0,
        bySize: {}           // { "4": {wins, bestStreak, fastestTime, fewestMoves}, ... }
    };

    function setCookie(name, value, days) {
        const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
        document.cookie = `${name}=${encodeURIComponent(JSON.stringify(value))}; expires=${expires}; path=/; SameSite=Lax`;
    }

    function getCookie(name) {
        const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
        if (match) {
            try {
                return JSON.parse(decodeURIComponent(match[2]));
            } catch (e) {
                return null;
            }
        }
        return null;
    }

    function load() {
        const saved = getCookie(COOKIE_NAME);
        if (saved) {
            // Merge with defaults to handle new fields
            return { ...defaultStats, ...saved };
        }
        return { ...defaultStats };
    }

    function save(stats) {
        setCookie(COOKIE_NAME, stats, COOKIE_DAYS);
    }

    let stats = load();

    return {
        get: () => ({ ...stats }),

        recordWin: (gridSize, timeMs, moves, streak) => {
            stats.totalWins++;
            stats.totalTimePlayed += timeMs;
            stats.totalMoves += moves;

            // Track by size (all records are per-size now)
            const sizeKey = String(gridSize);
            if (!stats.bySize[sizeKey]) {
                stats.bySize[sizeKey] = { wins: 0, bestStreak: 0, fastestTime: null, fewestMoves: null };
            }
            stats.bySize[sizeKey].wins++;

            if (streak > stats.bySize[sizeKey].bestStreak) {
                stats.bySize[sizeKey].bestStreak = streak;
            }
            if (stats.bySize[sizeKey].fastestTime === null || timeMs < stats.bySize[sizeKey].fastestTime) {
                stats.bySize[sizeKey].fastestTime = timeMs;
            }
            if (stats.bySize[sizeKey].fewestMoves === null || moves < stats.bySize[sizeKey].fewestMoves) {
                stats.bySize[sizeKey].fewestMoves = moves;
            }

            save(stats);
        },

        clear: () => {
            stats = { ...defaultStats, bySize: {} };
            save(stats);
        },

        formatTime: (ms) => {
            if (ms === null) return '--';
            const totalSeconds = Math.floor(ms / 1000);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            if (hours > 0) {
                return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        },

        formatTotalTime: (ms) => {
            const totalSeconds = Math.floor(ms / 1000);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    };
})();

// ============================================
// PERSISTENT GAME STATE (localStorage-based)
// ============================================
const GameState = (() => {
    const STORAGE_KEY = 'neuralReconGameState';

    function save() {
        if (isWon) {
            // Don't save won games - clear instead
            clear();
            return;
        }

        // Calculate total elapsed time (previous + current session)
        const currentSessionTime = gameStartTime ? Date.now() - gameStartTime : 0;
        const totalElapsed = elapsedTimeBeforePause + currentSessionTime;

        const state = {
            SIZE,
            currentSeed,
            solution,
            layers,
            currentIdx,
            targets,
            forkAnchors,
            stockpilePos,
            undoState,
            elapsedTime: totalElapsed, // Save total elapsed time instead of start time
            moveCount,
            winStreak,
            drawingMode,
            savedAt: Date.now()
        };

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (e) {
            console.warn('Failed to save game state:', e);
        }
    }

    function load() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.warn('Failed to load game state:', e);
        }
        return null;
    }

    function clear() {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (e) {
            console.warn('Failed to clear game state:', e);
        }
    }

    function hasSavedGame() {
        return load() !== null;
    }

    return { save, load, clear, hasSavedGame };
})();

// Flavor text generator - uses theme if available, falls back to cyberpunk defaults
const defaultBabble = {
    prefixes: ['Quantum', 'Neural', 'Synaptic', 'Crypto', 'Hyper', 'Meta', 'Nano', 'Cyber', 'Proto', 'Flux'],
    middles: ['mesh', 'link', 'sync', 'pulse', 'wave', 'core', 'node', 'grid', 'matrix', 'stream'],
    suffixes: ['initialized', 'calibrated', 'synchronized', 'stabilized', 'verified', 'authenticated', 'decrypted', 'restored', 'optimized', 'aligned'],
    extras: ['Buffer overflow contained.', 'Firewall integrity nominal.', 'Packet loss: 0.00%', 'Latency optimized.', 'Handshake complete.', 'Checksum verified.', 'Entropy normalized.', 'Signal-to-noise ratio optimal.', 'Bandwidth allocated.', 'Protocol engaged.']
};

function generateTechnoBabble() {
    // Use theme's babble generator if available
    if (typeof ThemeManager !== 'undefined' && ThemeManager.current()?.generateBabble) {
        return ThemeManager.generateBabble();
    }
    // Fallback to default
    const babble = defaultBabble;
    const prefix = babble.prefixes[Math.floor(Math.random() * babble.prefixes.length)];
    const middle = babble.middles[Math.floor(Math.random() * babble.middles.length)];
    const suffix = babble.suffixes[Math.floor(Math.random() * babble.suffixes.length)];
    const extra = babble.extras[Math.floor(Math.random() * babble.extras.length)];
    return `${prefix}-${middle} ${suffix}. ${extra}`;
}

function init(resetStreak = true, specificSeed = null) {
    isWon = false;
    document.getElementById('victoryOverlay').classList.remove('visible');
    ChipSound.newGame();
    // Reset stats for new game
    gameStartTime = Date.now();
    elapsedTimeBeforePause = 0;
    moveCount = 0;
    if(resetStreak) winStreak = 0;

    SIZE = parseInt(document.getElementById('gridSizeSelect').value);

    let scaleFactor = (SIZE <= 4) ? 1.8 : (SIZE <= 6 ? 1.4 : 1.0);
    document.documentElement.style.setProperty('--grid-size', SIZE);
    document.documentElement.style.setProperty('--cell-size', `min(${10 * scaleFactor}vw, ${10 * scaleFactor}vh, 75px)`);

    // Set up seed for this game
    const seed = specificSeed || generateSeed();
    setSeed(seed);
    addToSeedHistory(seed);

    // Generate maze
    generateMaze();

    // Ensure no row or column is entirely walls
    ensureNoFullWallLines();

    // Try to add a secret room with data stockpile
    tryAddSecretRoom();

    targets.r = solution.map(row => row.filter(v => v === 1).length);
    targets.c = Array(SIZE).fill(0).map((_, c) => solution.filter(r => r[c] === 1).length);
    layers = [Array(SIZE * SIZE).fill(0)];
    forkAnchors = [null, null, null, null];
    currentIdx = 0;
    undoState = null;
    document.getElementById('undoBtn').disabled = true;
    updateButtonStates();
    render();

    // Clear any saved state since we started a new game
    GameState.clear();
}

// Restore game from saved state
function restoreGameState(state) {
    isWon = false;
    document.getElementById('victoryOverlay').classList.remove('visible');

    // Restore all state variables
    SIZE = state.SIZE;
    currentSeed = state.currentSeed;
    solution = state.solution;
    layers = state.layers;
    currentIdx = state.currentIdx;
    targets = state.targets;
    forkAnchors = state.forkAnchors;
    stockpilePos = state.stockpilePos;
    undoState = state.undoState;
    // Restore elapsed time: start fresh timer, carry over previous elapsed
    elapsedTimeBeforePause = state.elapsedTime || 0;
    gameStartTime = Date.now();
    moveCount = state.moveCount;
    winStreak = state.winStreak || 0;
    if (state.drawingMode) {
        drawingMode = state.drawingMode;
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === drawingMode);
        });
    }

    // Update UI to match restored size
    document.getElementById('gridSizeSelect').value = SIZE;
    let scaleFactor = (SIZE <= 4) ? 1.8 : (SIZE <= 6 ? 1.4 : 1.0);
    document.documentElement.style.setProperty('--grid-size', SIZE);
    document.documentElement.style.setProperty('--cell-size', `min(${10 * scaleFactor}vw, ${10 * scaleFactor}vh, 75px)`);

    // Update seed display
    updateSeedDisplay();
    addToSeedHistory(currentSeed);

    // Update undo button state
    document.getElementById('undoBtn').disabled = undoState === null;

    updateButtonStates();
    render();
}

// Choose maze generation algorithm randomly (50/50)
function generateMaze() {
    if (seededRandom() < 0.5) {
        generateMazeDFS();
    } else {
        generateMazeAStar();
    }
}

// DFS maze generation - creates long natural walls
function generateMazeDFS() {
    solution = Array(SIZE).fill().map(() => Array(SIZE).fill(1));
    const start = {r: Math.floor(seededRandom()*SIZE), c: Math.floor(seededRandom()*SIZE)};
    solution[start.r][start.c] = 0;
    let stack = [start], visited = new Set([`${start.r},${start.c}`]);

    while(stack.length > 0) {
        const curr = stack[stack.length-1];
        let neighbors = [];
        [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dr, dc]) => {
            let nr=curr.r+dr, nc=curr.c+dc;
            if(nr>=0 && nr<SIZE && nc>=0 && nc<SIZE && !visited.has(`${nr},${nc}`)) {
                let pn = 0;
                [[0,1],[0,-1],[1,0],[-1,0]].forEach(([ddr,ddc])=>{
                    let nnr=nr+ddr, nnc=nc+ddc;
                    if(nnr>=0&&nnr<SIZE&&nnc>=0&&nnc<SIZE&&solution[nnr][nnc]===0) pn++;
                });
                if(pn === 1) neighbors.push({r:nr,c:nc});
            }
        });
        if(neighbors.length > 0) {
            let next = neighbors[Math.floor(seededRandom()*neighbors.length)];
            solution[next.r][next.c] = 0;
            visited.add(`${next.r},${next.c}`);
            stack.push(next);
        } else stack.pop();
    }
}

// A* pathfinding-based maze generation
function generateMazeAStar() {
    // Try with decreasing number of paths until successful
    for (let numPaths = SIZE - 2; numPaths >= 1; numPaths--) {
        for (let fullAttempt = 0; fullAttempt < 10; fullAttempt++) {
            if (tryGenerateMazeAStar(numPaths)) {
                return; // Success
            }
        }
    }
    // Fallback: use DFS method
    generateMazeDFS();
}

function tryGenerateMazeAStar(numPaths) {
    // Initialize grid: all walls (1)
    solution = Array(SIZE).fill().map(() => Array(SIZE).fill(1));

    // Weight grid: tracks wall weights for A* pathfinding
    // Infinity = impenetrable, 1.0 = normal wall, 0.4 = existing path
    const weights = Array(SIZE).fill().map(() => Array(SIZE).fill(1.0));

    // Track endpoints for later relaxation
    const endpoints = [];

    for (let pathIdx = 0; pathIdx < numPaths; pathIdx++) {
        // Try up to 10 times to find valid start/end points
        let pathSuccess = false;
        let minDistance = Math.max(2, SIZE - pathIdx - 2); // Relax distance requirement on retries

        for (let attempt = 0; attempt < 10; attempt++) {
            const start = findValidStartPoint(weights, minDistance > 2);
            if (!start) {
                minDistance = Math.max(2, minDistance - 1);
                continue;
            }

            const end = findValidEndPoint(weights, start, minDistance);
            if (!end) {
                minDistance = Math.max(2, minDistance - 1);
                continue;
            }

            // Try to carve path using A*
            const path = aStarCarve(start, end, weights);
            if (!path) {
                minDistance = Math.max(2, minDistance - 1);
                continue;
            }

            // Carve the path and update weights
            carvePath(path, weights, start, end);
            endpoints.push(start, end);
            pathSuccess = true;
            break;
        }

        if (!pathSuccess) {
            return false; // Failed to carve this path
        }
    }

    // Relax endpoint walls (change from infinite to 100 where safe)
    relaxEndpointWalls(endpoints, weights);

    // Connect disconnected subgraphs
    if (!connectDisconnectedSubgraphs(weights)) {
        return false;
    }

    // Final check: ensure no 2x2 open areas (secret room check happens later in tryAddSecretRoom)
    if (has2x2PathBlock()) {
        return false;
    }

    return true;
}

// Find a valid start point: 3-4 orthogonal neighbors as walls, at least one non-impenetrable
function findValidStartPoint(weights, requireFourWalls) {
    const candidates = [];

    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            const wallInfo = countOrthogonalWalls(r, c, weights);

            // Need 3 or 4 walls around it
            if (wallInfo.wallCount < 3) continue;
            if (requireFourWalls && wallInfo.wallCount < 4) continue;

            // If surrounded by 4 walls, at least one must not be impenetrable
            if (wallInfo.wallCount === 4 && wallInfo.penetrableCount === 0) continue;

            candidates.push({r, c});
        }
    }

    if (candidates.length === 0) return null;
    return candidates[Math.floor(seededRandom() * candidates.length)];
}

// Find a valid end point: distant from start, 3-4 walls around it
function findValidEndPoint(weights, start, minDistance) {
    const candidates = [];

    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            // Check distance (Euclidean)
            const dist = Math.sqrt((r - start.r) ** 2 + (c - start.c) ** 2);
            if (dist < minDistance) continue;

            const wallInfo = countOrthogonalWalls(r, c, weights);

            // Need 3 or 4 walls around it
            if (wallInfo.wallCount < 3) continue;

            // If surrounded by 4 walls, at least one must not be impenetrable
            if (wallInfo.wallCount === 4 && wallInfo.penetrableCount === 0) continue;

            candidates.push({r, c, dist});
        }
    }

    if (candidates.length === 0) return null;

    // Prefer more distant points
    candidates.sort((a, b) => b.dist - a.dist);
    const topCandidates = candidates.slice(0, Math.max(1, Math.floor(candidates.length / 3)));
    return topCandidates[Math.floor(seededRandom() * topCandidates.length)];
}

// Count orthogonal walls around a cell
function countOrthogonalWalls(r, c, weights) {
    let wallCount = 0;
    let penetrableCount = 0;

    for (const [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) {
            wallCount++; // Grid edge counts as impenetrable wall
        } else if (solution[nr][nc] === 1) {
            wallCount++;
            if (weights[nr][nc] !== Infinity) {
                penetrableCount++;
            }
        }
    }

    return {wallCount, penetrableCount};
}

// A* pathfinding to carve through the maze
function aStarCarve(start, end, weights) {
    const openSet = new MinHeap();
    const gScore = Array(SIZE).fill().map(() => Array(SIZE).fill(Infinity));
    const fScore = Array(SIZE).fill().map(() => Array(SIZE).fill(Infinity));
    const cameFrom = Array(SIZE).fill().map(() => Array(SIZE).fill(null));
    const prevDir = Array(SIZE).fill().map(() => Array(SIZE).fill(null));

    gScore[start.r][start.c] = 0;
    fScore[start.r][start.c] = euclideanDist(start, end);
    openSet.push({r: start.r, c: start.c, f: fScore[start.r][start.c]});

    const visited = new Set();

    while (!openSet.isEmpty()) {
        const current = openSet.pop();
        const key = `${current.r},${current.c}`;

        if (visited.has(key)) continue;
        visited.add(key);

        if (current.r === end.r && current.c === end.c) {
            // Reconstruct path
            const path = [];
            let curr = {r: end.r, c: end.c};
            while (curr) {
                path.unshift(curr);
                curr = cameFrom[curr.r][curr.c];
            }
            return path;
        }

        for (const [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
            const nr = current.r + dr, nc = current.c + dc;
            if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) continue;

            // Skip impenetrable walls
            if (weights[nr][nc] === Infinity) continue;

            // Calculate movement cost
            let moveCost;
            if (solution[nr][nc] === 0) {
                moveCost = 0.4; // Existing path
            } else {
                moveCost = weights[nr][nc]; // Wall (1.0 or other weight)
            }

            // Add turn penalty to favor straight lines
            const currentDir = `${dr},${dc}`;
            const previousDir = prevDir[current.r][current.c];
            if (previousDir !== null && previousDir !== currentDir) {
                moveCost += 0.001; // Small penalty for turning
            }

            const tentativeG = gScore[current.r][current.c] + moveCost;

            if (tentativeG < gScore[nr][nc]) {
                cameFrom[nr][nc] = {r: current.r, c: current.c};
                prevDir[nr][nc] = currentDir;
                gScore[nr][nc] = tentativeG;
                fScore[nr][nc] = tentativeG + euclideanDist({r: nr, c: nc}, end);
                openSet.push({r: nr, c: nc, f: fScore[nr][nc]});
            }
        }
    }

    return null; // No path found
}

function euclideanDist(a, b) {
    return Math.sqrt((a.r - b.r) ** 2 + (a.c - b.c) ** 2);
}

// Simple min-heap for A*
class MinHeap {
    constructor() { this.data = []; }
    push(item) {
        this.data.push(item);
        this.bubbleUp(this.data.length - 1);
    }
    pop() {
        if (this.data.length === 0) return null;
        const result = this.data[0];
        const last = this.data.pop();
        if (this.data.length > 0) {
            this.data[0] = last;
            this.bubbleDown(0);
        }
        return result;
    }
    isEmpty() { return this.data.length === 0; }
    bubbleUp(i) {
        while (i > 0) {
            const parent = Math.floor((i - 1) / 2);
            if (this.data[parent].f <= this.data[i].f) break;
            [this.data[parent], this.data[i]] = [this.data[i], this.data[parent]];
            i = parent;
        }
    }
    bubbleDown(i) {
        while (true) {
            const left = 2 * i + 1, right = 2 * i + 2;
            let smallest = i;
            if (left < this.data.length && this.data[left].f < this.data[smallest].f) smallest = left;
            if (right < this.data.length && this.data[right].f < this.data[smallest].f) smallest = right;
            if (smallest === i) break;
            [this.data[smallest], this.data[i]] = [this.data[i], this.data[smallest]];
            i = smallest;
        }
    }
}

// Carve the path and update weights
function carvePath(path, weights, start, end) {
    // Mark remaining 3 walls around start as impenetrable (after first step)
    const startNeighbors = getOrthogonalNeighbors(start.r, start.c);

    for (let i = 0; i < path.length; i++) {
        const {r, c} = path[i];

        // Carve this cell
        solution[r][c] = 0;
        weights[r][c] = 0.4; // Now it's a path

        // After first step, mark remaining walls around start as impenetrable
        if (i === 1) {
            for (const {nr, nc} of startNeighbors) {
                if (solution[nr][nc] === 1) {
                    weights[nr][nc] = Infinity;
                }
            }
        }

        // Check for 2x2 prevention: if this cell creates a 2x2 with 3 open cells,
        // mark the 4th as highly impenetrable
        check2x2Prevention(r, c, weights);
    }

    // Mark remaining 3 walls around end as impenetrable
    const endNeighbors = getOrthogonalNeighbors(end.r, end.c);
    for (const {nr, nc} of endNeighbors) {
        if (solution[nr][nc] === 1) {
            weights[nr][nc] = Infinity;
        }
    }
}

function getOrthogonalNeighbors(r, c) {
    const neighbors = [];
    for (const [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) {
            neighbors.push({nr, nc});
        }
    }
    return neighbors;
}

// Check all 2x2 areas containing this cell; if 3 are open, mark 4th as impenetrable
function check2x2Prevention(r, c, weights) {
    // Check all 4 possible 2x2 squares that include (r, c)
    const offsets = [[0, 0], [0, -1], [-1, 0], [-1, -1]];

    for (const [dr, dc] of offsets) {
        const topR = r + dr, topC = c + dc;
        if (topR < 0 || topR + 1 >= SIZE || topC < 0 || topC + 1 >= SIZE) continue;

        const cells = [
            {r: topR, c: topC},
            {r: topR, c: topC + 1},
            {r: topR + 1, c: topC},
            {r: topR + 1, c: topC + 1}
        ];

        let openCount = 0;
        let wallCell = null;

        for (const cell of cells) {
            if (solution[cell.r][cell.c] === 0) {
                openCount++;
            } else {
                wallCell = cell;
            }
        }

        // If 3 cells are open and 1 is a wall, mark that wall as impenetrable
        if (openCount === 3 && wallCell) {
            weights[wallCell.r][wallCell.c] = Infinity;
        }
    }
}

// Relax endpoint walls: change from infinite to 100 where it won't create 2x2 open areas
function relaxEndpointWalls(endpoints, weights) {
    for (const endpoint of endpoints) {
        const neighbors = getOrthogonalNeighbors(endpoint.r, endpoint.c);

        for (const {nr, nc} of neighbors) {
            if (solution[nr][nc] === 1 && weights[nr][nc] === Infinity) {
                // Check if carving this wall would create a 2x2 open area
                if (!wouldCreate2x2Open(nr, nc)) {
                    weights[nr][nc] = 100;
                }
            }
        }
    }
}

// Check if carving a wall at (r, c) would create a 2x2 open area
function wouldCreate2x2Open(r, c) {
    // Temporarily mark as open
    solution[r][c] = 0;

    // Check all 4 possible 2x2 squares that include (r, c)
    const offsets = [[0, 0], [0, -1], [-1, 0], [-1, -1]];
    let creates2x2 = false;

    for (const [dr, dc] of offsets) {
        const topR = r + dr, topC = c + dc;
        if (topR < 0 || topR + 1 >= SIZE || topC < 0 || topC + 1 >= SIZE) continue;

        if (solution[topR][topC] === 0 &&
            solution[topR][topC + 1] === 0 &&
            solution[topR + 1][topC] === 0 &&
            solution[topR + 1][topC + 1] === 0) {
            creates2x2 = true;
            break;
        }
    }

    // Restore
    solution[r][c] = 1;
    return creates2x2;
}

// Connect disconnected subgraphs
function connectDisconnectedSubgraphs(weights) {
    const components = findConnectedComponents();

    if (components.length <= 1) return true; // Already connected

    // Sort by size, largest first
    components.sort((a, b) => b.length - a.length);

    // Try to connect each smaller component to the main one
    const mainComponent = new Set(components[0].map(p => `${p.r},${p.c}`));

    for (let i = 1; i < components.length; i++) {
        const other = components[i];

        // Pick a random point from the smaller component
        const startPoint = other[Math.floor(seededRandom() * other.length)];

        // Find closest point in main component
        let closestPoint = null;
        let closestDist = Infinity;

        for (const key of mainComponent) {
            const [r, c] = key.split(',').map(Number);
            const dist = euclideanDist(startPoint, {r, c});
            if (dist < closestDist) {
                closestDist = dist;
                closestPoint = {r, c};
            }
        }

        if (!closestPoint) return false;

        // Use A* to carve a path between them
        const path = aStarCarve(startPoint, closestPoint, weights);
        if (!path) return false;

        // Carve the connecting path
        for (const {r, c} of path) {
            solution[r][c] = 0;
            weights[r][c] = 0.4;
            // Check 2x2 prevention
            check2x2Prevention(r, c, weights);
        }

        // Add other component to main
        for (const p of other) {
            mainComponent.add(`${p.r},${p.c}`);
        }
        // Add path cells to main
        for (const p of path) {
            mainComponent.add(`${p.r},${p.c}`);
        }
    }

    return true;
}

// Find connected components of open cells
function findConnectedComponents() {
    const visited = Array(SIZE).fill().map(() => Array(SIZE).fill(false));
    const components = [];

    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            if (solution[r][c] === 0 && !visited[r][c]) {
                const component = [];
                const stack = [{r, c}];
                visited[r][c] = true;

                while (stack.length > 0) {
                    const curr = stack.pop();
                    component.push(curr);

                    for (const [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
                        const nr = curr.r + dr, nc = curr.c + dc;
                        if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE &&
                            solution[nr][nc] === 0 && !visited[nr][nc]) {
                            visited[nr][nc] = true;
                            stack.push({r: nr, c: nc});
                        }
                    }
                }

                components.push(component);
            }
        }
    }

    return components;
}

// Ensure no row or column is entirely walls (SIZE walls)
function ensureNoFullWallLines() {
    // Check rows
    for (let r = 0; r < SIZE; r++) {
        const wallCount = solution[r].filter(v => v === 1).length;
        if (wallCount === SIZE) {
            // Find a cell adjacent to existing path that won't create 2x2 path block
            const candidates = [];
            for (let c = 0; c < SIZE; c++) {
                if (hasAdjacentPath(r, c)) candidates.push(c);
            }
            // Shuffle
            for (let i = candidates.length - 1; i > 0; i--) {
                const j = Math.floor(seededRandom() * (i + 1));
                [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
            }
            for (const c of candidates) {
                solution[r][c] = 0;
                if (!has2x2PathBlock()) break;
                solution[r][c] = 1;
            }
        }
    }

    // Check columns
    for (let c = 0; c < SIZE; c++) {
        let wallCount = 0;
        for (let r = 0; r < SIZE; r++) {
            if (solution[r][c] === 1) wallCount++;
        }
        if (wallCount === SIZE) {
            const candidates = [];
            for (let r = 0; r < SIZE; r++) {
                if (hasAdjacentPath(r, c)) candidates.push(r);
            }
            for (let i = candidates.length - 1; i > 0; i--) {
                const j = Math.floor(seededRandom() * (i + 1));
                [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
            }
            for (const r of candidates) {
                solution[r][c] = 0;
                if (!has2x2PathBlock()) break;
                solution[r][c] = 1;
            }
        }
    }
}

// Check if a cell has an adjacent path cell
function hasAdjacentPath(r, c) {
    for (const [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && solution[nr][nc] === 0) {
            return true;
        }
    }
    return false;
}

// Check if solution has any 2x2 path blocks
function has2x2PathBlock() {
    for (let r = 0; r < SIZE - 1; r++) {
        for (let c = 0; c < SIZE - 1; c++) {
            if (solution[r][c] === 0 && solution[r+1][c] === 0 &&
                solution[r][c+1] === 0 && solution[r+1][c+1] === 0) {
                return true;
            }
        }
    }
    return false;
}

// Try to add a secret 3x3 room with a single door and data stockpile
// Forces the room into the maze, adding walls as needed, then tries to fix connectivity
function tryAddSecretRoom() {
    stockpilePos = null;

    if (SIZE <= 5) return; // No data rooms for 5x5 or smaller
    if (SIZE === 6 && seededRandom() > 0.25) return; // Only 25% chance for 6x6

    // Save original solution in case we need to revert
    const originalSolution = solution.map(row => [...row]);

    // Candidate positions - prefer corners and edges
    const candidates = [];
    // Corners (0 or 1 row/col from edge)
    const edgeOffsets = [0, 1];
    for (const rOff of edgeOffsets) {
        for (const cOff of edgeOffsets) {
            candidates.push({r: rOff, c: cOff, priority: 0});
            candidates.push({r: rOff, c: SIZE - 3 - cOff, priority: 0});
            candidates.push({r: SIZE - 3 - rOff, c: cOff, priority: 0});
            candidates.push({r: SIZE - 3 - rOff, c: SIZE - 3 - cOff, priority: 0});
        }
    }
    // Add some interior positions with lower priority
    for (let r = 2; r <= SIZE - 5; r++) {
        for (let c = 2; c <= SIZE - 5; c++) {
            candidates.push({r, c, priority: 1});
        }
    }

    // Shuffle within priority groups
    candidates.sort((a, b) => a.priority - b.priority || seededRandom() - 0.5);

    for (const {r, c} of candidates) {
        // Restore original solution for each attempt
        for (let i = 0; i < SIZE; i++) solution[i] = [...originalSolution[i]];

        // Step 1: Find door candidates BEFORE modifying the maze
        // Look for path cells adjacent to where the perimeter walls will be
        const doorCandidates = [];

        // Top wall (at r-1) - check for paths at r-2 or paths that will be walled at r-1
        if (r > 0) {
            for (let dc = 0; dc < 3; dc++) {
                const wallC = c + dc;
                // Check if there's a path just outside where the wall will be
                if (r > 1 && solution[r - 2][wallC] === 0) {
                    doorCandidates.push({wallR: r - 1, wallC: wallC, side: 'top'});
                } else if (r === 1 && solution[0][wallC] === 0) {
                    // Room at row 1, wall at row 0 - but we can't have door at edge
                    // Actually if r=1, wall is at r-1=0, and we need path outside which would be r-2=-1 (invalid)
                }
            }
        }
        // Bottom wall (at r+3) - check for paths at r+4
        if (r + 3 < SIZE) {
            for (let dc = 0; dc < 3; dc++) {
                const wallC = c + dc;
                if (r + 4 < SIZE && solution[r + 4][wallC] === 0) {
                    doorCandidates.push({wallR: r + 3, wallC: wallC, side: 'bottom'});
                }
            }
        }
        // Left wall (at c-1) - check for paths at c-2
        if (c > 0) {
            for (let dr = 0; dr < 3; dr++) {
                const wallR = r + dr;
                if (c > 1 && solution[wallR][c - 2] === 0) {
                    doorCandidates.push({wallR: wallR, wallC: c - 1, side: 'left'});
                }
            }
        }
        // Right wall (at c+3) - check for paths at c+4
        if (c + 3 < SIZE) {
            for (let dr = 0; dr < 3; dr++) {
                const wallR = r + dr;
                if (c + 4 < SIZE && solution[wallR][c + 4] === 0) {
                    doorCandidates.push({wallR: wallR, wallC: c + 3, side: 'right'});
                }
            }
        }

        // Also check if perimeter itself has paths we can connect to
        // Top perimeter row
        if (r > 0) {
            for (let dc = 0; dc < 3; dc++) {
                if (solution[r - 1][c + dc] === 0) {
                    doorCandidates.push({wallR: r - 1, wallC: c + dc, side: 'top', isPath: true});
                }
            }
        }
        // Bottom perimeter row
        if (r + 3 < SIZE) {
            for (let dc = 0; dc < 3; dc++) {
                if (solution[r + 3][c + dc] === 0) {
                    doorCandidates.push({wallR: r + 3, wallC: c + dc, side: 'bottom', isPath: true});
                }
            }
        }
        // Left perimeter column
        if (c > 0) {
            for (let dr = 0; dr < 3; dr++) {
                if (solution[r + dr][c - 1] === 0) {
                    doorCandidates.push({wallR: r + dr, wallC: c - 1, side: 'left', isPath: true});
                }
            }
        }
        // Right perimeter column
        if (c + 3 < SIZE) {
            for (let dr = 0; dr < 3; dr++) {
                if (solution[r + dr][c + 3] === 0) {
                    doorCandidates.push({wallR: r + dr, wallC: c + 3, side: 'right', isPath: true});
                }
            }
        }

        if (doorCandidates.length === 0) continue;

        // Step 2: Add walls around the 3x3 room (perimeter)
        // Top perimeter
        if (r > 0) {
            for (let dc = -1; dc <= 3; dc++) {
                const cc = c + dc;
                if (cc >= 0 && cc < SIZE) solution[r - 1][cc] = 1;
            }
        }
        // Bottom perimeter
        if (r + 3 < SIZE) {
            for (let dc = -1; dc <= 3; dc++) {
                const cc = c + dc;
                if (cc >= 0 && cc < SIZE) solution[r + 3][cc] = 1;
            }
        }
        // Left perimeter
        if (c > 0) {
            for (let dr = 0; dr < 3; dr++) {
                solution[r + dr][c - 1] = 1;
            }
        }
        // Right perimeter
        if (c + 3 < SIZE) {
            for (let dr = 0; dr < 3; dr++) {
                solution[r + dr][c + 3] = 1;
            }
        }

        // Step 3: Carve out the 3x3 room interior
        for (let dr = 0; dr < 3; dr++) {
            for (let dc = 0; dc < 3; dc++) {
                solution[r + dr][c + dc] = 0;
            }
        }

        // Step 4: Open the door
        const door = doorCandidates[Math.floor(seededRandom() * doorCandidates.length)];
        solution[door.wallR][door.wallC] = 0;

        // Step 5: Check connectivity and try to fix if broken
        // Pass room bounds so we don't open additional doors in the room perimeter
        if (!tryFixConnectivity(r, c)) {
            continue; // Can't fix, try another position
        }

        // Step 6: Verify no 2x2 path clumps were created OUTSIDE the room
        if (has2x2PathClumpOutsideRoom(r, c)) {
            continue;
        }

        // Success! Place stockpile randomly in the room
        const roomCells = [];
        for (let dr = 0; dr < 3; dr++) {
            for (let dc = 0; dc < 3; dc++) {
                roomCells.push({r: r + dr, c: c + dc});
            }
        }
        stockpilePos = roomCells[Math.floor(seededRandom() * roomCells.length)];
        return;
    }

    // Failed to add room, restore original
    for (let i = 0; i < SIZE; i++) solution[i] = [...originalSolution[i]];
}

// Check if all path cells are connected, try to fix if not
// roomR, roomC define the 3x3 room - don't open walls on its perimeter
function tryFixConnectivity(roomR, roomC) {
    // Helper to check if a wall cell is on the room perimeter
    function isRoomPerimeter(wr, wc) {
        // Top perimeter: row roomR-1, cols roomC-1 to roomC+3
        if (wr === roomR - 1 && wc >= roomC - 1 && wc <= roomC + 3) return true;
        // Bottom perimeter: row roomR+3, cols roomC-1 to roomC+3
        if (wr === roomR + 3 && wc >= roomC - 1 && wc <= roomC + 3) return true;
        // Left perimeter: col roomC-1, rows roomR to roomR+2
        if (wc === roomC - 1 && wr >= roomR && wr <= roomR + 2) return true;
        // Right perimeter: col roomC+3, rows roomR to roomR+2
        if (wc === roomC + 3 && wr >= roomR && wr <= roomR + 2) return true;
        return false;
    }

    const pathCells = [];
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            if (solution[r][c] === 0) pathCells.push({r, c});
        }
    }
    if (pathCells.length === 0) return false;

    // Find connected components
    const visited = Array(SIZE).fill(null).map(() => Array(SIZE).fill(false));
    const components = [];

    for (const start of pathCells) {
        if (visited[start.r][start.c]) continue;
        const component = [];
        const stack = [start];
        while (stack.length > 0) {
            const {r, c} = stack.pop();
            if (visited[r][c]) continue;
            visited[r][c] = true;
            component.push({r, c});
            [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dr, dc]) => {
                const nr = r + dr, nc = c + dc;
                if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE &&
                    solution[nr][nc] === 0 && !visited[nr][nc]) {
                    stack.push({r: nr, c: nc});
                }
            });
        }
        components.push(component);
    }

    if (components.length === 1) return true; // Already connected

    // Try to connect components by removing wall cells
    // Find the largest component
    components.sort((a, b) => b.length - a.length);
    const mainComponent = new Set(components[0].map(p => `${p.r},${p.c}`));

    for (let i = 1; i < components.length; i++) {
        const other = components[i];
        let connected = false;

        // Try to find a wall cell that connects this component to main
        for (const {r, c} of other) {
            if (connected) break;
            [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dr, dc]) => {
                if (connected) return;
                const wallR = r + dr, wallC = c + dc;
                if (wallR < 0 || wallR >= SIZE || wallC < 0 || wallC >= SIZE) return;
                if (solution[wallR][wallC] !== 1) return;

                // Don't open walls on the room perimeter (would create extra doors)
                if (isRoomPerimeter(wallR, wallC)) return;

                // Check if removing this wall connects to main component
                [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dr2, dc2]) => {
                    if (connected) return;
                    const adjR = wallR + dr2, adjC = wallC + dc2;
                    if (adjR >= 0 && adjR < SIZE && adjC >= 0 && adjC < SIZE &&
                        mainComponent.has(`${adjR},${adjC}`)) {
                        // Remove wall to connect
                        solution[wallR][wallC] = 0;
                        // Add this component to main
                        other.forEach(p => mainComponent.add(`${p.r},${p.c}`));
                        mainComponent.add(`${wallR},${wallC}`);
                        connected = true;
                    }
                });
            });
        }

        if (!connected) return false; // Can't connect this component
    }

    return true;
}

// Check for 2x2 path clumps outside the room area
function has2x2PathClumpOutsideRoom(roomR, roomC) {
    for (let r = 0; r < SIZE - 1; r++) {
        for (let c = 0; c < SIZE - 1; c++) {
            // Skip if this 2x2 is entirely within the room
            if (r >= roomR && r + 1 <= roomR + 2 && c >= roomC && c + 1 <= roomC + 2) {
                continue;
            }
            if (solution[r][c] === 0 && solution[r+1][c] === 0 &&
                solution[r][c+1] === 0 && solution[r+1][c+1] === 0) {
                return true;
            }
        }
    }
    return false;
}

function handleCellAction(idx) {
    const r = Math.floor(idx / SIZE), c = idx % SIZE;
    if (isWon) return;

    // Get merged value (what's visible) and current layer value
    let mergedVal = 0;
    for (let j = 0; j <= currentIdx; j++) {
        if (layers[j][idx] === 1) mergedVal = 1;
        else if (layers[j][idx] === 2 && mergedVal !== 1) mergedVal = 2;
    }

    // Check if this cell is locked by a lower layer
    const isLocked = layers.slice(0, currentIdx).some(l => l[idx] !== 0);

    // Check if this is a dead end node or data stockpile
    const isDeadEnd = isTargetDeadEnd(r, c);
    const isStockpile = stockpilePos && stockpilePos.r === r && stockpilePos.c === c;

    // Use simple mode handling for wall/path/erase modes
    if (drawingMode !== 'smart') {
        if (!isDragging) {
            saveUndoState();
            isDragging = true;
            dragStartIdx = idx;

            // Determine action based on first cell: place or erase
            // For wall mode: if starting on wall, erase walls; otherwise place walls
            // For path mode: if starting on path, erase paths; otherwise place paths
            // For erase mode: always erase
            if (drawingMode === 'wall') {
                // Starting on a wall (that we can erase) = erase mode, otherwise place mode
                const canEraseWall = mergedVal === 1 && layers[currentIdx][idx] === 1 && !isLocked && !isDeadEnd && !isStockpile;
                dragMode = canEraseWall ? 0 : 1; // 0 = erasing walls, 1 = placing walls
            } else if (drawingMode === 'path') {
                // Starting on a path (that we can erase) = erase mode, otherwise place mode
                const canErasePath = mergedVal === 2 && layers[currentIdx][idx] === 2 && !isLocked && !isDeadEnd && !isStockpile;
                dragMode = canErasePath ? 0 : 2; // 0 = erasing paths, 2 = placing paths
            } else if (drawingMode === 'erase') {
                dragMode = 0;
            }
        }

        // Skip dead ends and stockpile (can't modify them)
        if (isDeadEnd || isStockpile) return;

        // Skip if locked by lower layer
        if (isLocked) return;

        // Apply the locked-in action
        if (drawingMode === 'wall') {
            if (dragMode === 1) {
                // Placing walls: on empty cells or over paths (if path is on current layer)
                if (mergedVal === 0 || (mergedVal === 2 && layers[currentIdx][idx] === 2)) {
                    if (currentIdx > 0 && forkAnchors[currentIdx] === null) {
                        forkAnchors[currentIdx] = {type: 'cell', idx: idx};
                    }
                    layers[currentIdx][idx] = 1;
                    ChipSound.wall();
                    moveCount++;
                    update();
                }
            } else {
                // Erasing walls: only walls on current layer
                if (mergedVal === 1 && layers[currentIdx][idx] === 1) {
                    if (currentIdx > 0 && forkAnchors[currentIdx] === null) {
                        forkAnchors[currentIdx] = {type: 'cell', idx: idx};
                    }
                    layers[currentIdx][idx] = 0;
                    ChipSound.erase();
                    moveCount++;
                    update();
                }
            }
        } else if (drawingMode === 'path') {
            if (dragMode === 2) {
                // Placing paths: on empty cells or over walls (if wall is on current layer)
                if (mergedVal === 0 || (mergedVal === 1 && layers[currentIdx][idx] === 1)) {
                    if (currentIdx > 0 && forkAnchors[currentIdx] === null) {
                        forkAnchors[currentIdx] = {type: 'cell', idx: idx};
                    }
                    layers[currentIdx][idx] = 2;
                    ChipSound.path();
                    moveCount++;
                    update();
                }
            } else {
                // Erasing paths: only paths on current layer
                if (mergedVal === 2 && layers[currentIdx][idx] === 2) {
                    if (currentIdx > 0 && forkAnchors[currentIdx] === null) {
                        forkAnchors[currentIdx] = {type: 'cell', idx: idx};
                    }
                    layers[currentIdx][idx] = 0;
                    ChipSound.erase();
                    moveCount++;
                    update();
                }
            }
        } else if (drawingMode === 'erase') {
            // Erase mode: clear any cell on current layer
            if (layers[currentIdx][idx] !== 0) {
                if (currentIdx > 0 && forkAnchors[currentIdx] === null) {
                    forkAnchors[currentIdx] = {type: 'cell', idx: idx};
                }
                layers[currentIdx][idx] = 0;
                ChipSound.erase();
                moveCount++;
                update();
            }
        }
        return;
    }

    // Smart mode - original complex behavior
    const currentVal = layers[currentIdx][idx];

    if (!isDragging) {
        // Starting a new drag - save undo state
        saveUndoState();
        isDragging = true;
        dragStartIdx = idx;
        dragStartVal = mergedVal; // Use merged value for drag start type detection
        dragPendingToggle = false;
        dragToggleMode = false;

        // If starting on a dead end node or stockpile, start drawing paths
        if (isDeadEnd || isStockpile) {
            // Check neighbors (only for dead ends, not stockpile) - requires dead-end fill assist
            if (isDeadEnd && isDeadEndFillEnabled()) {
                const merged = Array(SIZE*SIZE).fill(0);
                layers.forEach(l => l.forEach((s, i) => { if(s === 1) merged[i] = 1; if(s === 2 && merged[i] !== 1) merged[i] = 2; }));

                const neighbors = [[r-1,c],[r+1,c],[r,c-1],[r,c+1]];
                let pathCount = 0;
                let wallCount = 0;
                let emptyNeighbors = [];

                neighbors.forEach(([nr, nc]) => {
                    if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) {
                        wallCount++; // Grid edge counts as wall
                    } else {
                        const nIdx = nr * SIZE + nc;
                        if (merged[nIdx] === 1) wallCount++;
                        else if (merged[nIdx] === 2 || isTargetDeadEnd(nr, nc)) pathCount++;
                        else emptyNeighbors.push(nIdx);
                    }
                });

                // If surrounded by 3 walls and 1 empty, add path to the empty spot
                if (wallCount === 3 && emptyNeighbors.length === 1) {
                    const nIdx = emptyNeighbors[0];
                    let locked = false;
                    for (let j = 0; j < currentIdx; j++) if (layers[j][nIdx] !== 0) locked = true;
                    if (!locked) {
                        if (currentIdx > 0 && forkAnchors[currentIdx] === null) {
                            forkAnchors[currentIdx] = {type: 'cell', idx: idx};
                        }
                        layers[currentIdx][nIdx] = 2;
                        ChipSound.autoComplete();
                        dragMode = 2; // Continue dragging paths
                        moveCount++;
                        update();
                        return;
                    }
                }

                // If exactly one path neighbor, fill empty neighbors with walls
                if (pathCount === 1 && emptyNeighbors.length > 0) {
                    if (currentIdx > 0 && forkAnchors[currentIdx] === null) {
                        forkAnchors[currentIdx] = {type: 'cell', idx: idx};
                    }
                    emptyNeighbors.forEach(nIdx => {
                        // Only fill if not locked by lower layer
                        let locked = false;
                        for (let j = 0; j < currentIdx; j++) if (layers[j][nIdx] !== 0) locked = true;
                        if (!locked) layers[currentIdx][nIdx] = 1;
                    });
                    ChipSound.autoComplete();
                    moveCount++;
                    update();
                    return;
                }
            }

            // Start drawing paths from dead end or stockpile
            // Don't set anchor here - set it when we actually draw on a cell
            dragMode = 2;
            return;
        }

        // Starting on empty cell (merged): immediately start drawing walls
        if (mergedVal === 0) {
            dragMode = 1;
            if (currentIdx > 0 && forkAnchors[currentIdx] === null) {
                forkAnchors[currentIdx] = {type: 'cell', idx: idx};
            }
            layers[currentIdx][idx] = 1;
            ChipSound.wall();
            moveCount++;
            update();
            return;
        }

        // Starting on wall or path (could be from lower layer): wait for drag or mouse up
        dragPendingToggle = !isLocked; // Only allow toggle if not locked
        dragMode = mergedVal; // Remember what we started on (merged value)
        return;
    } else {
        // Continuing a drag - skip dead ends and stockpile
        if (isDeadEnd) return;
        if (isStockpile) return;

        // If we had a pending toggle (started on wall/path, now dragging)
        if (dragPendingToggle) {
            dragPendingToggle = false;

            // Dragged to empty space (merged): continue drawing the same type
            if (mergedVal === 0) {
                // dragMode is already set to what we started on (1 or 2)
                if (currentIdx > 0 && forkAnchors[currentIdx] === null) {
                    forkAnchors[currentIdx] = {type: 'cell', idx: idx}; // Anchor on first drawn cell
                }
                layers[currentIdx][idx] = dragMode;
                if (dragMode === 1) ChipSound.wall();
                else if (dragMode === 2) ChipSound.path();
                moveCount++;
                update();
                return;
            }

            // Dragged to same type: enter toggle mode (convert to next type)
            if (mergedVal === dragStartVal && !isLocked) {
                dragToggleMode = true;
                // wall -> path, path -> empty
                dragMode = dragStartVal === 1 ? 2 : 0;
                // Toggle the start cell (only if not locked)
                const startLocked = layers.slice(0, currentIdx).some(l => l[dragStartIdx] !== 0);
                if (!startLocked) {
                    if (currentIdx > 0 && forkAnchors[currentIdx] === null) {
                        forkAnchors[currentIdx] = {type: 'cell', idx: dragStartIdx}; // Anchor on start cell if we modify it
                    }
                    layers[currentIdx][dragStartIdx] = dragMode;
                } else if (currentIdx > 0 && forkAnchors[currentIdx] === null) {
                    forkAnchors[currentIdx] = {type: 'cell', idx: idx}; // Anchor on this cell if start was locked
                }
                // Toggle this cell too
                const prevVal = layers[currentIdx][idx];
                layers[currentIdx][idx] = dragMode;
                if (dragMode === 2) ChipSound.path();
                else if (dragMode === 0 && prevVal !== 0) ChipSound.erase();
                moveCount++;
                update();
                return;
            }

            // Dragged to different non-empty type: just start drawing the original type
            // Don't change the different type cell, no anchor yet (nothing drawn)
            return;
        }

        // Normal drag continuation
        if (dragToggleMode) {
            // In toggle mode: only affect same type as start or empty cells
            // Must not be locked by lower layer
            if (!isLocked && (mergedVal === dragStartVal || mergedVal === 0)) {
                if (currentIdx > 0 && forkAnchors[currentIdx] === null) {
                    forkAnchors[currentIdx] = {type: 'cell', idx: idx};
                }
                const prevVal = layers[currentIdx][idx];
                layers[currentIdx][idx] = dragMode;
                if (dragMode === 2) ChipSound.path();
                else if (dragMode === 0 && prevVal !== 0) ChipSound.erase();
                update();
            }
            // Different non-empty type or locked: ignore
            return;
        }

        // Standard drag behavior - skip if locked
        if (isLocked) return;

        // If erasing (dragMode 0), can erase anything on current layer
        // If drawing walls (dragMode 1), only draw over empty cells
        // If drawing paths (dragMode 2), only draw over empty cells
        if (dragMode === 1 && mergedVal !== 0) return;
        if (dragMode === 2 && mergedVal !== 0) return;

        // Set fork anchor on first cell we actually draw on
        if (currentIdx > 0 && forkAnchors[currentIdx] === null) {
            forkAnchors[currentIdx] = {type: 'cell', idx: idx};
        }
        const prevVal = layers[currentIdx][idx];
        layers[currentIdx][idx] = dragMode;
        if (dragMode === 1) ChipSound.wall();
        else if (dragMode === 2) ChipSound.path();
        else if (dragMode === 0 && prevVal !== 0) ChipSound.erase();
        update();
    }
}

// Helper to check if a cell is a fixed path (dead end or stockpile)
function isFixedPath(r, c) {
    return isTargetDeadEnd(r, c) || (stockpilePos && stockpilePos.r === r && stockpilePos.c === c);
}

function handleLabelClick(isRow, index) {
    if (isWon) return;

    const merged = Array(SIZE*SIZE).fill(0);
    layers.forEach(l => l.forEach((s, i) => { if(s === 1) merged[i] = 1; if(s === 2 && merged[i] !== 1) merged[i] = 2; }));

    // Count current walls and paths in this row/column
    let wallCount = 0, pathCount = 0;
    const target = isRow ? targets.r[index] : targets.c[index];
    const expectedPaths = SIZE - target;

    for (let i = 0; i < SIZE; i++) {
        const idx = isRow ? index * SIZE + i : i * SIZE + index;
        const r = Math.floor(idx / SIZE), c = idx % SIZE;
        if (merged[idx] === 1) wallCount++;
        else if (merged[idx] === 2 || isFixedPath(r, c)) pathCount++;
    }

    const wallsComplete = wallCount === target;
    const pathsComplete = !wallsComplete && pathCount === expectedPaths;

    // Check if the appropriate completion type is enabled
    // Wall completion (green headers) fills paths when walls are done
    // Path completion (blue headers) fills walls when paths are done
    if (wallsComplete && !isWallCompletionEnabled()) return;
    if (pathsComplete && !isPathCompletionEnabled()) return;
    if (!wallsComplete && !pathsComplete) return;

    // Determine what to fill: paths if walls complete, walls if paths complete
    const fillType = wallsComplete ? 2 : 1; // 2 = path, 1 = wall

    // Check if there are any empty cells to fill
    let hasEmpty = false;
    for (let i = 0; i < SIZE; i++) {
        const idx = isRow ? index * SIZE + i : i * SIZE + index;
        const r = Math.floor(idx / SIZE), c = idx % SIZE;
        if (merged[idx] === 0 && !isFixedPath(r, c)) {
            let locked = false;
            for (let j = 0; j < currentIdx; j++) if (layers[j][idx] !== 0) locked = true;
            if (!locked) hasEmpty = true;
        }
    }
    if (!hasEmpty) return;

    // Save undo state before making changes
    saveUndoState();

    // Set fork anchor to the label
    if (currentIdx > 0 && forkAnchors[currentIdx] === null) {
        forkAnchors[currentIdx] = {type: isRow ? 'row' : 'col', index: index};
    }

    // Fill empty cells with the appropriate type
    for (let i = 0; i < SIZE; i++) {
        const idx = isRow ? index * SIZE + i : i * SIZE + index;
        const r = Math.floor(idx / SIZE), c = idx % SIZE;

        if (merged[idx] === 0 && !isFixedPath(r, c)) {
            // Check if locked by lower layer
            let locked = false;
            for (let j = 0; j < currentIdx; j++) if (layers[j][idx] !== 0) locked = true;
            if (!locked) {
                layers[currentIdx][idx] = fillType;
            }
        }
    }

    ChipSound.labelFill();
    moveCount++;
    update();
}

function render() {
    const gameB = document.getElementById('mainGrid');
    const rowL = document.getElementById('rowLabels'), colL = document.getElementById('colLabels');
    gameB.querySelectorAll('.cell').forEach(c => c.remove());
    rowL.innerHTML = ''; colL.innerHTML = '';
    gameB.style.gridTemplateColumns = `repeat(${SIZE}, var(--cell-size))`;
    gameB.style.gridTemplateRows = `repeat(${SIZE}, var(--cell-size))`;
    for(let i=0; i<SIZE; i++) {
        const rowLabel = document.createElement('div');
        rowLabel.className = 'count-neon';
        rowLabel.style.cursor = 'pointer';
        rowLabel.onclick = () => handleLabelClick(true, i);
        rowL.appendChild(rowLabel);

        const colLabel = document.createElement('div');
        colLabel.className = 'count-neon';
        colLabel.style.cursor = 'pointer';
        colLabel.onclick = () => handleLabelClick(false, i);
        colL.appendChild(colLabel);
    }
    for(let i=0; i<SIZE*SIZE; i++) {
        const gCell = document.createElement('div');
        gCell.className = 'cell';
        gCell.onpointerdown = (e) => { gCell.releasePointerCapture(e.pointerId); handleCellAction(i); };
        gCell.onpointerenter = () => { if (isDragging) handleCellAction(i); };
        gameB.appendChild(gCell);
    }
    window.onpointerup = () => {
        // If we had a pending toggle (clicked on wall/path without dragging), complete it
        if (dragPendingToggle && dragStartIdx !== null) {
            // Toggle: wall -> path, path -> empty
            const newVal = dragStartVal === 1 ? 2 : 0;
            if (currentIdx > 0 && forkAnchors[currentIdx] === null) {
                forkAnchors[currentIdx] = {type: 'cell', idx: dragStartIdx};
            }
            layers[currentIdx][dragStartIdx] = newVal;
            if (newVal === 2) ChipSound.path();
            else if (newVal === 0) ChipSound.erase();
            moveCount++;
            update();
        }
        isDragging = false;
        dragMode = null;
        dragStartIdx = null;
        dragStartVal = null;
        dragPendingToggle = false;
        dragToggleMode = false;
    };
    update();
}

function isTargetDeadEnd(r, c) {
    if(solution[r][c] === 1) return false;
    let walls = 0;
    [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dr, dc]) => {
        let nr=r+dr, nc=c+dc;
        if(nr<0||nr>=SIZE||nc<0||nc>=SIZE||solution[nr][nc] === 1) walls++;
    });
    return walls >= 3;
}

// Check if player's current state is a valid alternate solution
// Returns true if: row/col counts match, no 2x2 path blocks, paths connected
function isValidAlternateSolution(merged) {
    // 1. Check row wall counts match targets
    for (let r = 0; r < SIZE; r++) {
        let wallCount = 0;
        for (let c = 0; c < SIZE; c++) {
            if (merged[r * SIZE + c] === 1) wallCount++;
        }
        if (wallCount !== targets.r[r]) return false;
    }

    // 2. Check column wall counts match targets
    for (let c = 0; c < SIZE; c++) {
        let wallCount = 0;
        for (let r = 0; r < SIZE; r++) {
            if (merged[r * SIZE + c] === 1) wallCount++;
        }
        if (wallCount !== targets.c[c]) return false;
    }

    // 3. Check no 2x2 path blocks (except around stockpile)
    for (let r = 0; r < SIZE - 1; r++) {
        for (let c = 0; c < SIZE - 1; c++) {
            const corners = [
                r * SIZE + c,
                r * SIZE + c + 1,
                (r + 1) * SIZE + c,
                (r + 1) * SIZE + c + 1
            ];

            // Check if all 4 corners are paths (not walls)
            if (corners.every(idx => merged[idx] !== 1)) {
                // Allow 2x2 paths near stockpile (it's in a 3x3 room)
                if (stockpilePos) {
                    let nearStockpile = false;
                    for (const idx of corners) {
                        const cr = Math.floor(idx / SIZE), cc = idx % SIZE;
                        const dr = Math.abs(cr - stockpilePos.r);
                        const dc = Math.abs(cc - stockpilePos.c);
                        if (dr <= 1 && dc <= 1) nearStockpile = true;
                    }
                    if (nearStockpile) continue;
                }
                return false; // Invalid 2x2 path block
            }
        }
    }

    // 4. Check all paths are connected (single connected component)
    // Find all path cells
    const pathCells = [];
    for (let i = 0; i < SIZE * SIZE; i++) {
        if (merged[i] !== 1) pathCells.push(i);
    }

    if (pathCells.length === 0) return false;

    // BFS from first path cell
    const visited = new Set();
    const stack = [pathCells[0]];
    visited.add(pathCells[0]);

    while (stack.length > 0) {
        const idx = stack.pop();
        const r = Math.floor(idx / SIZE), c = idx % SIZE;

        [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dr, dc]) => {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) {
                const nIdx = nr * SIZE + nc;
                if (merged[nIdx] !== 1 && !visited.has(nIdx)) {
                    visited.add(nIdx);
                    stack.push(nIdx);
                }
            }
        });
    }

    // All path cells should be visited
    if (visited.size !== pathCells.length) return false;

    return true;
}

function getShortestPathBetween(merged, startIdx, endIdx) {
    let queue = [[startIdx]];
    let visited = new Set([startIdx]);
    while (queue.length > 0) {
        let path = queue.shift();
        let curr = path[path.length - 1];
        if (curr === endIdx) return path;
        let r = Math.floor(curr / SIZE), c = curr % SIZE;
        [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dr, dc]) => {
            let nr = r + dr, nc = c + dc;
            let nIdx = nr * SIZE + nc;
            if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && !visited.has(nIdx)) {
                if (merged[nIdx] === 2 || isTargetDeadEnd(nr, nc)) {
                    visited.add(nIdx);
                    queue.push([...path, nIdx]);
                }
            }
        });
    }
    return null;
}

function update() {
    if (isWon) return;
    const cells = document.getElementById('mainGrid').querySelectorAll('.cell');
    const rl = document.getElementById('rowLabels').children;
    const cl = document.getElementById('colLabels').children;
    const merged = Array(SIZE*SIZE).fill(0);
    layers.forEach(l => l.forEach((s, i) => { if(s === 1) merged[i] = 1; if(s === 2 && merged[i] !== 1) merged[i] = 2; }));

    // Check for win: either exact match OR valid alternate solution
    let allWallsCorrect = true;
    for(let i=0; i<SIZE*SIZE; i++) {
        const r = Math.floor(i/SIZE), c = i%SIZE;
        if(solution[r][c] === 1 && merged[i] !== 1) allWallsCorrect = false;
        if(merged[i] === 1 && solution[r][c] !== 1) allWallsCorrect = false;
    }
    if(allWallsCorrect || isValidAlternateSolution(merged)) { isWon = true; triggerVictorySequence(); return; }

    const rowTotals = Array(SIZE).fill(0), colTotals = Array(SIZE).fill(0);
    const rowPathTotals = Array(SIZE).fill(0), colPathTotals = Array(SIZE).fill(0);
    const rowOk = Array(SIZE).fill(false), colOk = Array(SIZE).fill(false);
    const rowPathOk = Array(SIZE).fill(false), colPathOk = Array(SIZE).fill(false);
    const fa = forkAnchors[currentIdx];
    const anchorColor = colors[currentIdx]; // green, amber, or magenta
    for(let r=0; r<SIZE; r++) {
        let wallCount = 0, pathCount = 0;
        for(let c=0; c<SIZE; c++) {
            const idx = r*SIZE+c;
            if(merged[idx] === 1) wallCount++;
            // Count paths, dead ends, and stockpile (which are effectively paths)
            else if(merged[idx] === 2 || isFixedPath(r, c)) pathCount++;
        }
        rowTotals[r] = wallCount;
        rowPathTotals[r] = pathCount;
        rl[r].innerText = targets.r[r];
        rowOk[r] = wallCount === targets.r[r];
        // Path is complete when we have exactly (SIZE - target walls) paths
        const expectedPaths = SIZE - targets.r[r];
        // Blue headers are controlled by path completion toggle
        rowPathOk[r] = isPathCompletionEnabled() && !rowOk[r] && pathCount === expectedPaths;
        let rowClass = `count-neon ${rowOk[r] ? 'count-ok' : (rowPathOk[r] ? 'count-path-ok' : (wallCount > targets.r[r] ? 'count-over' : ''))}`;
        if (currentIdx > 0 && fa && fa.type === 'row' && fa.index === r) {
            rowClass += ` label-anchor label-anchor-${anchorColor}`;
        }
        rl[r].className = rowClass;
    }
    for(let c=0; c<SIZE; c++) {
        let wallCount = 0, pathCount = 0;
        for(let r=0; r<SIZE; r++) {
            const idx = r*SIZE+c;
            if(merged[idx] === 1) wallCount++;
            // Count paths, dead ends, and stockpile (which are effectively paths)
            else if(merged[idx] === 2 || isFixedPath(r, c)) pathCount++;
        }
        colTotals[c] = wallCount;
        colPathTotals[c] = pathCount;
        cl[c].innerText = targets.c[c];
        colOk[c] = wallCount === targets.c[c];
        // Path is complete when we have exactly (SIZE - target walls) paths
        const expectedPaths = SIZE - targets.c[c];
        // Blue headers are controlled by path completion toggle
        colPathOk[c] = isPathCompletionEnabled() && !colOk[c] && pathCount === expectedPaths;
        let colClass = `count-neon ${colOk[c] ? 'count-ok' : (colPathOk[c] ? 'count-path-ok' : (wallCount > targets.c[c] ? 'count-over' : ''))}`;
        if (currentIdx > 0 && fa && fa.type === 'col' && fa.index === c) {
            colClass += ` label-anchor label-anchor-${anchorColor}`;
        }
        cl[c].className = colClass;
    }

    // Apply row/col ok classes to cells with staggered animation delays
    // Pulse should span the entire grid: when last cell starts, first should be dimming
    const cellPulseTime = 0.3; // how long each cell's pulse lasts (seconds)
    const totalTravelTime = cellPulseTime * SIZE; // time for pulse to travel across grid
    const randomPause = 2 + Math.random() * 3; // 2-5 seconds random pause between loops
    const pulseDuration = totalTravelTime + randomPause;

    for(let i=0; i<SIZE*SIZE; i++) {
        const r = Math.floor(i/SIZE), c = i % SIZE;
        cells[i].classList.toggle('cell-row-ok', rowOk[r]);
        cells[i].classList.toggle('cell-col-ok', colOk[c]);
        // Set animation delays based on position (row pulse: left to right, col pulse: top to bottom)
        cells[i].style.setProperty('--row-delay', `${c * cellPulseTime}s`);
        cells[i].style.setProperty('--col-delay', `${r * cellPulseTime}s`);
        cells[i].style.setProperty('--pulse-duration', `${pulseDuration}s`);
    }

    const subgraphMap = Array(SIZE * SIZE).fill(-1);
    let subgraphs = [];
    for (let i = 0; i < SIZE * SIZE; i++) {
        if (merged[i] !== 1 && subgraphMap[i] === -1) {
            const currentGraph = [];
            const stack = [i]; subgraphMap[i] = subgraphs.length;
            while (stack.length > 0) {
                const curr = stack.pop(); currentGraph.push(curr);
                const r = Math.floor(curr/SIZE), c = curr % SIZE;
                [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dr, dc]) => {
                    const nr = r + dr, nc = c + dc, nIdx = nr * SIZE + nc;
                    if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && merged[nIdx] !== 1 && subgraphMap[nIdx] === -1) {
                        subgraphMap[nIdx] = subgraphs.length; stack.push(nIdx);
                    }
                });
            }
            subgraphs.push(currentGraph);
        }
    }

    let primaryIdx = -1;
    if (subgraphs.length > 0) {
        let maxLen = -1;
        subgraphs.forEach((g, idx) => { if(g.length > maxLen) { maxLen = g.length; primaryIdx = idx; } });
    }
    const erraticIndices = new Set();
    subgraphs.forEach((g, idx) => { if (idx !== primaryIdx) g.forEach(i => erraticIndices.add(i)); });

    const authenticatedIndices = new Set();
    const authenticatedEdges = new Set();
    const visitedNetwork = new Set();
    for(let i=0; i<SIZE*SIZE; i++) {
        if(merged[i] === 2 && !visitedNetwork.has(i)) {
            let cluster = [], deadEndsFound = [], stack = [i];
            visitedNetwork.add(i);
            while(stack.length > 0) {
                let idx = stack.pop(), cr = Math.floor(idx/SIZE), cc = idx%SIZE;
                cluster.push(idx);
                [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dr, dc]) => {
                    let nr=cr+dr, nc=cc+dc;
                    if(nr>=0 && nr<SIZE && nc>=0 && nc<SIZE) {
                        let nIdx = nr*SIZE+nc;
                        if(merged[nIdx] === 2 && !visitedNetwork.has(nIdx)) { visitedNetwork.add(nIdx); stack.push(nIdx); } 
                        else if(isTargetDeadEnd(nr, nc)) { if(!deadEndsFound.includes(nIdx)) deadEndsFound.push(nIdx); }
                    }
                });
            }
            if(deadEndsFound.length >= 2) {
                for(let start = 0; start < deadEndsFound.length; start++) {
                    for(let end = start + 1; end < deadEndsFound.length; end++) {
                        let path = getShortestPathBetween(merged, deadEndsFound[start], deadEndsFound[end]);
                        if(path) {
                            path.forEach(nodeIdx => authenticatedIndices.add(nodeIdx));
                            for(let pIdx=0; pIdx < path.length - 1; pIdx++) {
                                let u = Math.min(path[pIdx], path[pIdx+1]);
                                let v = Math.max(path[pIdx], path[pIdx+1]);
                                authenticatedEdges.add(`${u}-${v}`);
                            }
                        }
                    }
                }
            }
        }
    }

    // Check if a 3x3 room starting at (roomR, roomC) is surrounded by 11 walls (1 door)
    // AND has no walls inside the room
    function isRoomSurroundedByWalls(roomR, roomC) {
        if (roomR < 0 || roomR + 2 >= SIZE || roomC < 0 || roomC + 2 >= SIZE) return false;
        if (!stockpilePos) return false;

        // Check if stockpile is in this room
        if (stockpilePos.r < roomR || stockpilePos.r > roomR + 2 ||
            stockpilePos.c < roomC || stockpilePos.c > roomC + 2) return false;

        // Check that there are no walls inside the 3x3 room
        for (let dr = 0; dr < 3; dr++) {
            for (let dc = 0; dc < 3; dc++) {
                const idx = (roomR + dr) * SIZE + (roomC + dc);
                if (merged[idx] === 1) return false; // Wall inside room - not valid
            }
        }

        // Count walls around the perimeter (should be 11 for 1 door)
        let wallCount = 0;
        // Top edge (3 cells above room)
        for (let dc = 0; dc < 3; dc++) {
            if (roomR === 0) wallCount++; // Grid edge counts as wall
            else if (merged[(roomR - 1) * SIZE + (roomC + dc)] === 1) wallCount++;
        }
        // Bottom edge (3 cells below room)
        for (let dc = 0; dc < 3; dc++) {
            if (roomR + 2 === SIZE - 1) wallCount++; // Grid edge counts as wall
            else if (merged[(roomR + 3) * SIZE + (roomC + dc)] === 1) wallCount++;
        }
        // Left edge (3 cells left of room)
        for (let dr = 0; dr < 3; dr++) {
            if (roomC === 0) wallCount++; // Grid edge counts as wall
            else if (merged[(roomR + dr) * SIZE + (roomC - 1)] === 1) wallCount++;
        }
        // Right edge (3 cells right of room)
        for (let dr = 0; dr < 3; dr++) {
            if (roomC + 2 === SIZE - 1) wallCount++; // Grid edge counts as wall
            else if (merged[(roomR + dr) * SIZE + (roomC + 3)] === 1) wallCount++;
        }

        return wallCount === 11; // 12 perimeter cells - 1 door = 11 walls
    }

    // Check if a 3x3 room has all 9 cells as path AND contains stockpile
    // Stockpile cell counts as always having a path
    function isComplete3x3Path(roomR, roomC) {
        if (roomR < 0 || roomR + 2 >= SIZE || roomC < 0 || roomC + 2 >= SIZE) return false;
        if (!stockpilePos) return false;

        // Check if stockpile is in this room
        if (stockpilePos.r < roomR || stockpilePos.r > roomR + 2 ||
            stockpilePos.c < roomC || stockpilePos.c > roomC + 2) return false;

        // Check all 9 cells are path (merged === 2, dead end, or stockpile)
        for (let dr = 0; dr < 3; dr++) {
            for (let dc = 0; dc < 3; dc++) {
                const idx = (roomR + dr) * SIZE + (roomC + dc);
                const cr = roomR + dr, cc = roomC + dc;
                const isStockpileCell = stockpilePos.r === cr && stockpilePos.c === cc;
                if (merged[idx] !== 2 && !isTargetDeadEnd(cr, cc) && !isStockpileCell) return false;
            }
        }

        return true;
    }

    // Check if stockpile is in a room surrounded by 11 walls
    let stockpileInWalledRoom = false;
    if (stockpilePos) {
        for (let roomR = Math.max(0, stockpilePos.r - 2); roomR <= stockpilePos.r; roomR++) {
            for (let roomC = Math.max(0, stockpilePos.c - 2); roomC <= stockpilePos.c; roomC++) {
                if (isRoomSurroundedByWalls(roomR, roomC)) {
                    stockpileInWalledRoom = true;
                    break;
                }
            }
            if (stockpileInWalledRoom) break;
        }
    }

    // Find complete 3x3 path cells (for exemption from clump detection)
    const complete3x3Cells = new Set();
    if (stockpilePos) {
        for (let roomR = Math.max(0, stockpilePos.r - 2); roomR <= stockpilePos.r; roomR++) {
            for (let roomC = Math.max(0, stockpilePos.c - 2); roomC <= stockpilePos.c; roomC++) {
                if (isComplete3x3Path(roomR, roomC)) {
                    for (let dr = 0; dr < 3; dr++) {
                        for (let dc = 0; dc < 3; dc++) {
                            complete3x3Cells.add((roomR + dr) * SIZE + (roomC + dc));
                        }
                    }
                }
            }
        }
    }

    const clumps = new Set();
    for (let r=0; r<SIZE-1; r++) {
        for (let c=0; c<SIZE-1; c++) {
            let i = r*SIZE+c;
            // Check the 4 corners of the 2x2 square
            let corners = [i, i+1, i+SIZE, i+SIZE+1];
            let pathCount = 0;
            let deadEndCount = 0;
            let nearStockpile = false;

            corners.forEach((idx) => {
                let cr = Math.floor(idx/SIZE), cc = idx%SIZE;
                if(merged[idx] === 2) pathCount++;
                else if(isTargetDeadEnd(cr, cc)) deadEndCount++;
                // Check if this corner is the stockpile or orthogonally adjacent to it
                if(stockpilePos) {
                    const dr = Math.abs(cr - stockpilePos.r);
                    const dc = Math.abs(cc - stockpilePos.c);
                    if((dr === 0 && dc <= 1) || (dc === 0 && dr <= 1)) nearStockpile = true;
                }
            });

            // Skip clump detection if any corner is the stockpile or adjacent to it
            // (stockpile is part of a 3x3 room, so 2x2 paths around it are expected)
            if (nearStockpile) continue;

            // Mark as clump if path nodes + dead end nodes fill the 2x2 square
            // BUT exempt if all corners are part of a complete 3x3 path with stockpile
            if(pathCount + deadEndCount === 4 && pathCount > 0) {
                const allInComplete3x3 = corners.every(idx => complete3x3Cells.has(idx));
                if (!allInComplete3x3) {
                    corners.forEach(idx => clumps.add(idx));
                }
            }
        }
    }

    for(let i=0; i<SIZE*SIZE; i++) {
        const cell = cells[i], r = Math.floor(i/SIZE), c = i%SIZE;
        cell.innerHTML = ''; cell.classList.remove('cell-erratic');
        let playerWalls = 0, connectedToManualPath = 0;
        [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dr, dc]) => {
            let nr=r+dr, nc=c+dc;
            if(nr<0||nr>=SIZE||nc<0||nc>=SIZE||merged[nr*SIZE+nc] === 1) playerWalls++;
            else if(merged[nr*SIZE+nc] === 2) connectedToManualPath++;
        });
        if (erraticIndices.has(i)) cell.classList.add('cell-erratic');

        // Render fork anchor diamond on cells
        if (currentIdx > 0 && fa && fa.type === 'cell' && fa.idx === i) {
            const anchor = document.createElement('div');
            anchor.className = 'fork-anchor';
            anchor.style.borderColor = `var(--neon-${colors[currentIdx]})`;
            anchor.style.boxShadow = `0 0 10px var(--neon-${colors[currentIdx]})`;
            setAnimationDelay(anchor);
            cell.appendChild(anchor);
        }

        // Render stockpile if this is the stockpile position
        if (stockpilePos && stockpilePos.r === r && stockpilePos.c === c) {
            const stockpileState = stockpileInWalledRoom ? 'complete' : 'normal';
            let stockpile;

            // Use theme renderer if available
            if (typeof ThemeManager !== 'undefined' && ThemeManager.current()?.renderStockpile) {
                stockpile = ThemeManager.render.stockpile(stockpileState);
            } else {
                stockpile = document.createElement('div');
                stockpile.className = 'stockpile' + (stockpileInWalledRoom ? ' stockpile-complete' : '');
                const icon = document.createElement('div');
                icon.className = 'stockpile-icon';
                setAnimationDelay(icon);
                stockpile.appendChild(icon);
            }
            setAnimationDelay(stockpile);
            cell.appendChild(stockpile);
        }

        if(isTargetDeadEnd(r, c)) {
            // Determine node state
            let nodeState = 'normal';
            if (erraticIndices.has(i) || playerWalls === 4) nodeState = 'erratic';
            else if (isProgressIndicatorsEnabled() && playerWalls === 3) nodeState = 'complete';
            else if (connectedToManualPath >= 2) nodeState = 'conflict';

            let node;
            // Use theme renderer if available
            if (typeof ThemeManager !== 'undefined' && ThemeManager.current()?.renderNode) {
                node = ThemeManager.render.node(nodeState);
            } else {
                node = document.createElement('div');
                let nodeClass = 'node';
                if (nodeState === 'erratic') nodeClass += ' node-erratic';
                else if (nodeState === 'complete') nodeClass += ' node-complete';
                else if (nodeState === 'conflict') nodeClass += ' node-conflict';
                node.className = nodeClass;
                const core = document.createElement('div');
                core.className = 'node-core';
                setAnimationDelay(core);
                node.appendChild(core);
            }
            setAnimationDelay(node);
            cell.appendChild(node);
        } else if(isErrorIndicatorsEnabled() && playerWalls >= 3 && merged[i] !== 1) {
            const box = document.createElement('div');
            box.className = 'invalid-box';
            if ((rowTotals[r] > targets.r[r] || colTotals[c] > targets.c[c]) || merged[i] === 2) box.classList.add('invalid-box-high');
            setAnimationDelay(box);
            box.innerHTML = '<div class="invalid-x"></div>';
            cell.appendChild(box);
        }

        const isStockpileCell = stockpilePos && stockpilePos.r === r && stockpilePos.c === c;
        if (merged[i] !== 1) {
            // Draw trace lines from path nodes, dead ends, or stockpile (which acts as path)
            if (merged[i] === 2 || isTargetDeadEnd(r, c) || isStockpileCell) {
                [[0,1,'e','h','trace-e'],[0,-1,'w','h','trace-w'],[1,0,'s','v','trace-s'],[-1,0,'n','v','trace-n']].forEach(([dr, dc, dir, orient, cls]) => {
                    let nr=r+dr, nc=c+dc, nIdx = nr*SIZE+nc;
                    const isNeighborStockpile = stockpilePos && stockpilePos.r === nr && stockpilePos.c === nc;
                    if(nr>=0 && nr<SIZE && nc>=0 && nc<SIZE && (merged[nIdx] === 2 || isTargetDeadEnd(nr, nc) || isNeighborStockpile)) {
                        const trace = document.createElement('div');
                        trace.className = `trace-line trace-${orient} ${cls}`;
                        let u = Math.min(i, nIdx), v = Math.max(i, nIdx);
                        if (isErrorIndicatorsEnabled() && (clumps.has(i) || clumps.has(nIdx))) trace.classList.add('trace-error');
                        else if (erraticIndices.has(i)) trace.classList.add('trace-erratic');
                        else if (isProgressIndicatorsEnabled() && (authenticatedEdges.has(`${u}-${v}`) || (complete3x3Cells.has(i) && complete3x3Cells.has(nIdx)))) {
                            // Use blue for traces inside the 3x3 data node, green for authenticated paths
                            const bothIn3x3 = complete3x3Cells.has(i) && complete3x3Cells.has(nIdx);
                            trace.classList.add(bothIn3x3 ? 'trace-complete-blue' : 'trace-complete');
                            // Check if both cells are from lower layers (should dim the trace)
                            const iFromLower = layers[currentIdx][i] !== 2 && layers.slice(0, currentIdx).some(l => l[i] === 2);
                            const nFromLower = layers[currentIdx][nIdx] !== 2 && layers.slice(0, currentIdx).some(l => l[nIdx] === 2);
                            // Also consider dead ends and stockpile as "current" (not dimmed)
                            const iIsCurrent = layers[currentIdx][i] === 2 || isTargetDeadEnd(r, c) || isStockpileCell;
                            const nIsCurrent = layers[currentIdx][nIdx] === 2 || isTargetDeadEnd(nr, nc) || isNeighborStockpile;
                            if (!iIsCurrent && !nIsCurrent && (iFromLower || nFromLower)) {
                                trace.classList.add('trace-dim');
                            }
                        }
                        cell.appendChild(trace);
                    }
                });
            }
        }

        // Render answer key overlay if enabled
        if (showKey && solution[r][c] === 1) {
            const keyOverlay = document.createElement('div');
            keyOverlay.className = 'answer-key-overlay';
            cell.appendChild(keyOverlay);
        }

        layers.forEach((layer, lIdx) => {
            if (layer[i] === 1) {
                const isError = rowTotals[r] > targets.r[r] || colTotals[c] > targets.c[c];
                const isCurrentLayer = lIdx === currentIdx;

                // Use theme renderer if available
                let wall;
                if (typeof ThemeManager !== 'undefined' && ThemeManager.current()?.renderWall) {
                    wall = ThemeManager.render.wall(lIdx, isError, isCurrentLayer);
                } else {
                    wall = document.createElement('div');
                    const errorClass = isError ? (isCurrentLayer ? 'wall-error' : 'wall-error-dim') : '';
                    wall.className = `wall wall-l${lIdx} ${isCurrentLayer ? '' : 'opacity-40'} ${errorClass}`;
                }
                if (isError && isCurrentLayer) setAnimationDelay(wall);
                cell.appendChild(wall);
            } else if (layer[i] === 2) {
                const isCurrentLayer = lIdx === currentIdx;
                const hasAnimation = clumps.has(i) || erraticIndices.has(i);

                // Determine path state
                let pathState = 'normal';
                if (isErrorIndicatorsEnabled() && clumps.has(i)) pathState = 'error';
                else if (erraticIndices.has(i)) pathState = 'erratic';
                else if (isProgressIndicatorsEnabled() && complete3x3Cells.has(i)) pathState = 'complete-blue';
                else if (isProgressIndicatorsEnabled() && authenticatedIndices.has(i)) pathState = 'complete';

                // Use theme renderer if available
                let dot;
                if (typeof ThemeManager !== 'undefined' && ThemeManager.current()?.renderPathDot) {
                    dot = ThemeManager.render.pathDot(lIdx, isCurrentLayer, pathState);
                } else {
                    dot = document.createElement('div');
                    let dotClass = `path-dot ${isCurrentLayer ? '' : 'path-dot-dim'}`;
                    if (pathState === 'error') dotClass += ' path-dot-error';
                    else if (pathState === 'erratic') dotClass += ' path-dot-erratic';
                    else if (pathState === 'complete-blue') dotClass += ' path-dot-complete-blue';
                    else if (pathState === 'complete') dotClass += ' path-dot-complete';
                    dot.className = dotClass;
                }
                if (hasAnimation) setAnimationDelay(dot);
                cell.appendChild(dot);
            }
        });
    }

    updateButtonStates();

    // Save game state after each update
    GameState.save();
}

function getPathOrder() {
    // Find all path cells (non-wall cells in solution)
    const pathCells = new Set();
    for(let i=0; i<SIZE*SIZE; i++) {
        const r = Math.floor(i/SIZE), c = i%SIZE;
        if(solution[r][c] === 0) pathCells.add(i);
    }
    if(pathCells.size === 0) return [];

    // Find a dead end to start from
    let startIdx = pathCells.values().next().value;
    for(let idx of pathCells) {
        const r = Math.floor(idx/SIZE), c = idx%SIZE;
        if(isTargetDeadEnd(r, c)) { startIdx = idx; break; }
    }

    // BFS flood fill - returns array of arrays, each inner array is cells at that distance
    const waves = [[startIdx]];
    const visited = new Set([startIdx]);

    while(visited.size < pathCells.size) {
        const currentWave = waves[waves.length - 1];
        const nextWave = [];

        for(let idx of currentWave) {
            const r = Math.floor(idx/SIZE), c = idx%SIZE;
            for(let [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
                const nr = r+dr, nc = c+dc, nIdx = nr*SIZE+nc;
                if(nr>=0 && nr<SIZE && nc>=0 && nc<SIZE && !visited.has(nIdx) && pathCells.has(nIdx)) {
                    visited.add(nIdx);
                    nextWave.push(nIdx);
                }
            }
        }

        if(nextWave.length === 0) break;
        waves.push(nextWave);
    }

    return waves;
}

function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function triggerVictorySequence() {
    ChipSound.victory();
    // Fill in any missing path nodes on the current layer (skip dead end nodes)
    for(let i=0; i<SIZE*SIZE; i++) {
        const r = Math.floor(i/SIZE), c = i%SIZE;
        if(solution[r][c] === 0 && !isTargetDeadEnd(r, c)) {
            // Check if this path cell is not already marked
            let alreadyMarked = false;
            for(let l of layers) {
                if(l[i] === 2) { alreadyMarked = true; break; }
            }
            if(!alreadyMarked) {
                layers[currentIdx][i] = 2;
            }
        }
    }

    // Re-render to show the last wall and filled path nodes
    const cells = document.getElementById('mainGrid').querySelectorAll('.cell');
    const rl = document.getElementById('rowLabels').children;
    const cl = document.getElementById('colLabels').children;
    const merged = Array(SIZE*SIZE).fill(0);
    layers.forEach(l => l.forEach((s, i) => { if(s === 1) merged[i] = 1; if(s === 2 && merged[i] !== 1) merged[i] = 2; }));

    // Quick render of walls and path dots
    for(let i=0; i<SIZE*SIZE; i++) {
        const cell = cells[i], r = Math.floor(i/SIZE), c = i%SIZE;
        cell.innerHTML = '';

        if(isTargetDeadEnd(r, c)) {
            const node = document.createElement('div');
            node.className = 'node node-complete';
            setAnimationDelay(node);
            const core = document.createElement('div');
            core.className = 'node-core';
            setAnimationDelay(core);
            node.appendChild(core);
            cell.appendChild(node);
        }

        // Render stockpile if this is the stockpile position
        if (stockpilePos && stockpilePos.r === r && stockpilePos.c === c) {
            const stockpile = document.createElement('div');
            stockpile.className = 'stockpile stockpile-complete';
            const icon = document.createElement('div');
            icon.className = 'stockpile-icon';
            setAnimationDelay(icon);
            stockpile.appendChild(icon);
            setAnimationDelay(stockpile);
            cell.appendChild(stockpile);
        }

        // Draw traces for path cells
        if (merged[i] !== 1) {
            if (merged[i] === 2 || isTargetDeadEnd(r, c)) {
                [[0,1,'e','h','trace-e'],[0,-1,'w','h','trace-w'],[1,0,'s','v','trace-s'],[-1,0,'n','v','trace-n']].forEach(([dr, dc, dir, orient, cls]) => {
                    let nr=r+dr, nc=c+dc, nIdx = nr*SIZE+nc;
                    if(nr>=0 && nr<SIZE && nc>=0 && nc<SIZE && (merged[nIdx] === 2 || isTargetDeadEnd(nr, nc))) {
                        const trace = document.createElement('div');
                        trace.className = `trace-line trace-${orient} ${cls} trace-complete`;
                        cell.appendChild(trace);
                    }
                });
            }
        }

        layers.forEach((layer, lIdx) => {
            if (layer[i] === 1) {
                cell.appendChild(Object.assign(document.createElement('div'), {className: `wall wall-l${lIdx}`}));
            } else if (layer[i] === 2) {
                cell.appendChild(Object.assign(document.createElement('div'), {className: `path-dot path-dot-complete`}));
            }
        });
    }

    // Update labels to show complete
    for(let r=0; r<SIZE; r++) {
        rl[r].className = 'count-neon count-ok';
    }
    for(let c=0; c<SIZE; c++) {
        cl[c].className = 'count-neon count-ok';
    }

    // Small delay to let the DOM render the final state before animation
    setTimeout(() => {
        const waves = getPathOrder();
        const delayPerWave = Math.max(40, 600 / waves.length); // Faster for larger grids

        // Find which wave contains the stockpile
        let stockpileWaveIdx = -1;
        if (stockpilePos) {
            const stockpileIdx = stockpilePos.r * SIZE + stockpilePos.c;
            for (let wIdx = 0; wIdx < waves.length; wIdx++) {
                if (waves[wIdx].includes(stockpileIdx)) {
                    stockpileWaveIdx = wIdx;
                    break;
                }
            }
        }

        // Animate cells wave by wave (flood fill effect)
        waves.forEach((wave, waveIdx) => {
            setTimeout(() => {
                wave.forEach(idx => {
                    cells[idx].classList.add('cell-victory-glow');
                });

                // Trigger data retrieved animation when wave reaches stockpile
                if (waveIdx === stockpileWaveIdx && stockpilePos) {
                    const stockpileCell = cells[stockpilePos.r * SIZE + stockpilePos.c];
                    const stockpileEl = stockpileCell.querySelector('.stockpile');
                    if (stockpileEl) {
                        stockpileEl.classList.add('stockpile-retrieved');
                    }
                }
            }, waveIdx * delayPerWave);
        });

        // Show victory overlay after path animation completes
        const totalAnimTime = waves.length * delayPerWave + 400;
        setTimeout(() => {
            // Update stats
            winStreak++;
            const currentSessionTime = gameStartTime ? Date.now() - gameStartTime : 0;
            const elapsed = elapsedTimeBeforePause + currentSessionTime;
            document.getElementById('statTime').textContent = formatTime(elapsed);
            document.getElementById('statMoves').textContent = moveCount;
            document.getElementById('statStreak').textContent = winStreak;

            // Record persistent stats
            PlayerStats.recordWin(SIZE, elapsed, moveCount, winStreak);

            // Generate techno-babble
            document.getElementById('technoBabble').textContent = generateTechnoBabble();

            // Highlight streak if > 1
            const streakEl = document.getElementById('statStreak');
            if(winStreak > 1) {
                streakEl.classList.add('highlight');
            } else {
                streakEl.classList.remove('highlight');
            }

            document.getElementById('victoryOverlay').classList.add('visible');
        }, totalAnimTime);
    }, 100);
}

// Check if user has made any progress on the current puzzle
function hasPuzzleProgress() {
    for (let layer of layers) {
        for (let val of layer) {
            if (val !== 0) return true;
        }
    }
    return false;
}

// Reset puzzle confirmation dialog
const resetPuzzleDialog = document.getElementById('resetPuzzleDialog');
let pendingResetAction = null;
let pendingResetCancel = null;

function confirmReset(action, onCancel) {
    if (hasPuzzleProgress()) {
        pendingResetAction = action;
        pendingResetCancel = onCancel || null;
        ChipSound.click();
        resetPuzzleDialog.showModal();
    } else {
        action();
    }
}

function cancelReset() {
    ChipSound.click();
    resetPuzzleDialog.close();
    if (pendingResetCancel) {
        pendingResetCancel();
        pendingResetCancel = null;
    }
    pendingResetAction = null;
}

document.getElementById('resetPuzzleCancelBtn').onclick = cancelReset;

document.getElementById('resetPuzzleConfirmBtn').onclick = () => {
    ChipSound.click();
    resetPuzzleDialog.close();
    if (pendingResetAction) {
        pendingResetAction();
        pendingResetAction = null;
    }
    pendingResetCancel = null;
};

resetPuzzleDialog.addEventListener('click', (e) => {
    if (e.target === resetPuzzleDialog) {
        cancelReset();
    }
});

document.getElementById('gridSizeSelect').onchange = () => {
    const select = document.getElementById('gridSizeSelect');
    const previousSize = SIZE;
    confirmReset(
        () => init(true),
        () => { select.value = previousSize; }
    );
};
document.getElementById('undoBtn').onclick = undo;
document.getElementById('addLayerBtn').onclick = () => {
    if(currentIdx < 3) {
        ChipSound.fork();
        saveUndoState();
        layers.push(Array(SIZE*SIZE).fill(0));
        currentIdx++;
        forkAnchors[currentIdx] = null;
        updateButtonStates();
        update();
    }
};
document.getElementById('commitBtn').onclick = () => {
    if(currentIdx > 0) {
        ChipSound.commit();
        saveUndoState();
        const cur = layers.pop();
        currentIdx--;
        cur.forEach((v, i) => { if(v !== 0) layers[currentIdx][i] = v; });
        updateButtonStates();
        update();
    }
};
document.getElementById('discardBtn').onclick = () => {
    if(currentIdx > 0) {
        ChipSound.abort();
        saveUndoState();
        layers.pop();
        currentIdx--;
        updateButtonStates();
        update();
    }
};
document.getElementById('newMazeBtn').onclick = () => confirmReset(() => init(true));
document.getElementById('nextLevelBtn').onclick = () => init(false);
document.getElementById('decryptToggleBtn').onclick = () => {
    ChipSound.click();
    showKey = !showKey;
    const btn = document.getElementById('decryptToggleBtn');
    const state = document.getElementById('decryptToggleState');
    if (showKey) {
        btn.classList.remove('off');
        state.textContent = 'ON';
        state.classList.remove('off-state');
    } else {
        btn.classList.add('off');
        state.textContent = 'OFF';
        state.classList.add('off-state');
    }
    saveUserPreferences();
    update();
};

// ============================================
// HINT SYSTEM
// ============================================

// Convert column index to letter (0 = A, 1 = B, etc.)
function colToLetter(c) {
    return String.fromCharCode(65 + c);
}

// Convert row index to 1-based number
function rowToNumber(r) {
    return r + 1;
}

// Get cell reference like "A1", "B3", etc.
function cellRef(r, c) {
    return `${colToLetter(c)}${rowToNumber(r)}`;
}

// Get merged board state (walls=1, paths=2, empty=0)
function getMergedBoard() {
    const merged = Array(SIZE * SIZE).fill(0);
    layers.forEach(l => l.forEach((s, i) => {
        if (s === 1) merged[i] = 1;
        if (s === 2 && merged[i] !== 1) merged[i] = 2;
    }));
    return merged;
}

// Count walls and paths in a row
function getRowCounts(merged, r) {
    let walls = 0, paths = 0;
    for (let c = 0; c < SIZE; c++) {
        const idx = r * SIZE + c;
        if (merged[idx] === 1) walls++;
        else if (merged[idx] === 2 || isFixedPath(r, c)) paths++;
    }
    return { walls, paths, target: targets.r[r], expectedPaths: SIZE - targets.r[r] };
}

// Count walls and paths in a column
function getColCounts(merged, c) {
    let walls = 0, paths = 0;
    for (let r = 0; r < SIZE; r++) {
        const idx = r * SIZE + c;
        if (merged[idx] === 1) walls++;
        else if (merged[idx] === 2 || isFixedPath(r, c)) paths++;
    }
    return { walls, paths, target: targets.c[c], expectedPaths: SIZE - targets.c[c] };
}

// Check if current board state has any mistakes compared to solution
// Returns the first mistake found (wall where path should be, or path where wall should be)
function findMistake(merged) {
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            const idx = r * SIZE + c;
            const playerState = merged[idx]; // 0=empty, 1=wall, 2=path
            const solutionIsWall = solution[r][c] === 1;

            // Player placed a wall where solution has a path
            if (playerState === 1 && !solutionIsWall) {
                return { type: 'cell', r, c, mistake: 'wall-on-path' };
            }
            // Player placed a path where solution has a wall
            if (playerState === 2 && solutionIsWall) {
                return { type: 'cell', r, c, mistake: 'path-on-wall' };
            }
        }
    }
    return null;
}

// Check for 2x2 areas with 3 paths (the 4th must be a wall)
// Skip areas near the data cache (stockpile) since 2x2 paths are allowed there
function find2x2With3Paths(merged) {
    for (let r = 0; r < SIZE - 1; r++) {
        for (let c = 0; c < SIZE - 1; c++) {
            const corners = [
                { r, c, idx: r * SIZE + c },
                { r, c: c + 1, idx: r * SIZE + c + 1 },
                { r: r + 1, c, idx: (r + 1) * SIZE + c },
                { r: r + 1, c: c + 1, idx: (r + 1) * SIZE + c + 1 }
            ];

            // Skip if any corner is near the stockpile
            if (stockpilePos) {
                let nearStockpile = false;
                for (const corner of corners) {
                    const dr = Math.abs(corner.r - stockpilePos.r);
                    const dc = Math.abs(corner.c - stockpilePos.c);
                    if (dr <= 1 && dc <= 1) {
                        nearStockpile = true;
                        break;
                    }
                }
                if (nearStockpile) continue;
            }

            let pathCount = 0;
            let emptyCell = null;

            for (const corner of corners) {
                if (merged[corner.idx] === 2 || isFixedPath(corner.r, corner.c)) {
                    pathCount++;
                } else if (merged[corner.idx] === 0) {
                    emptyCell = corner;
                }
            }

            if (pathCount === 3 && emptyCell) {
                return { r: emptyCell.r, c: emptyCell.c };
            }
        }
    }
    return null;
}

// Check if a cell is part of a 2x2 path block
function isIn2x2PathBlock(merged, r, c) {
    // Check all 2x2 squares that include this cell
    for (const [dr, dc] of [[0, 0], [0, -1], [-1, 0], [-1, -1]]) {
        const topR = r + dr, topC = c + dc;
        if (topR < 0 || topR + 1 >= SIZE || topC < 0 || topC + 1 >= SIZE) continue;

        let allPaths = true;
        for (const [rr, cc] of [[0, 0], [0, 1], [1, 0], [1, 1]]) {
            const checkR = topR + rr, checkC = topC + cc;
            const idx = checkR * SIZE + checkC;
            // Path if merged[idx] === 2 OR it's a fixed path (dead end/stockpile)
            if (merged[idx] !== 2 && !isFixedPath(checkR, checkC)) {
                allPaths = false;
                break;
            }
        }
        if (allPaths) return true;
    }
    return false;
}

// Check if a dead end has multiple paths connected to it
function deadEndHasMultiplePaths(merged, r, c) {
    if (!isTargetDeadEnd(r, c)) return false;

    let pathCount = 0;
    for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) continue;
        const nIdx = nr * SIZE + nc;
        // Count paths (merged === 2) or other fixed paths (dead ends, stockpile)
        if (merged[nIdx] === 2 || isFixedPath(nr, nc)) {
            pathCount++;
        }
    }
    return pathCount > 1;
}

// Check if a path cell is an invalid dead end (surrounded by 3 walls but not a target dead end)
function isInvalidDeadEnd(merged, r, c) {
    // Must be a path (user-placed or fixed path like stockpile)
    const idx = r * SIZE + c;
    if (merged[idx] !== 2 && !isFixedPath(r, c)) return false;

    // Skip if it's a target dead end (those are supposed to have 3 walls)
    if (isTargetDeadEnd(r, c)) return false;

    // Count walls around this cell
    let wallCount = 0;
    for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) {
            wallCount++; // Edge counts as wall
        } else if (merged[nr * SIZE + nc] === 1) {
            wallCount++;
        }
    }

    return wallCount >= 3;
}

// Check if a mistake is "obvious" - returns type of obviousness
function getMistakeObviousness(merged, r, c) {
    const { walls: rowWalls, target: rowTarget } = getRowCounts(merged, r);
    const { paths: rowPaths, expectedPaths: rowExpectedPaths } = getRowCounts(merged, r);
    const { walls: colWalls, target: colTarget } = getColCounts(merged, c);
    const { paths: colPaths, expectedPaths: colExpectedPaths } = getColCounts(merged, c);

    // Check for row/col count violations (pulsing red)
    if (rowWalls > rowTarget) return { type: 'row-walls', index: r };
    if (rowPaths > rowExpectedPaths) return { type: 'row-paths', index: r };
    if (colWalls > colTarget) return { type: 'col-walls', index: c };
    if (colPaths > colExpectedPaths) return { type: 'col-paths', index: c };

    // Check for 2x2 path block
    if (isIn2x2PathBlock(merged, r, c)) return { type: '2x2' };

    // Check if mistake is adjacent to a dead end with multiple paths
    for (const [dr, dc] of [[0, 0], [0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) continue;
        if (deadEndHasMultiplePaths(merged, nr, nc)) {
            return { type: 'dead-end-multiple', r: nr, c: nc };
        }
    }

    return null;
}

// Format a list of cell references with proper grammar
// 1 cell: "A1"
// 2 cells: "A1 and B2"
// 3+ cells: "A1, B2, and C3" (Oxford comma)
function formatCellList(cells) {
    const refs = cells.map(cell => cellRef(cell.r, cell.c));
    if (refs.length === 1) return refs[0];
    if (refs.length === 2) return `${refs[0]} and ${refs[1]}`;
    return refs.slice(0, -1).join(', ') + ', and ' + refs[refs.length - 1];
}

// Find any invalid dead end on the board (path boxed in by 3+ walls that isn't a target dead end)
function findInvalidDeadEnd(merged) {
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            if (isInvalidDeadEnd(merged, r, c)) {
                return { r, c };
            }
        }
    }
    return null;
}

// Hint 1: Check for mistakes against solution
// If onlyObvious is true, only report mistakes that are obviously wrong (e.g., row/col overflow)
function hintCheckMistakes(merged, onlyObvious = false) {
    // First check for invalid dead ends (structural error, doesn't need findMistake)
    const invalidDeadEnd = findInvalidDeadEnd(merged);
    if (invalidDeadEnd) {
        return {
            message: `The path at ${cellRef(invalidDeadEnd.r, invalidDeadEnd.c)} is boxed in by walls but isn't a dead end node. It needs another exit.`,
            highlight: { type: 'cell', r: invalidDeadEnd.r, c: invalidDeadEnd.c }
        };
    }

    const mistake = findMistake(merged);
    if (mistake) {
        const obvious = getMistakeObviousness(merged, mistake.r, mistake.c);

        if (obvious) {
            // Indicate general area, not exact cell
            if (obvious.type === 'row-walls') {
                return {
                    message: `Row ${rowToNumber(obvious.index)} has too many walls.`,
                    highlight: { type: 'row', index: obvious.index }
                };
            } else if (obvious.type === 'row-paths') {
                return {
                    message: `Row ${rowToNumber(obvious.index)} has too many paths.`,
                    highlight: { type: 'row', index: obvious.index }
                };
            } else if (obvious.type === 'col-walls') {
                return {
                    message: `Column ${colToLetter(obvious.index)} has too many walls.`,
                    highlight: { type: 'col', index: obvious.index }
                };
            } else if (obvious.type === 'col-paths') {
                return {
                    message: `Column ${colToLetter(obvious.index)} has too many paths.`,
                    highlight: { type: 'col', index: obvious.index }
                };
            } else if (obvious.type === '2x2') {
                return {
                    message: `There's a 2×2 block of paths. One of them should be a wall.`,
                    highlight: null
                };
            } else if (obvious.type === 'dead-end-multiple') {
                return {
                    message: `The dead end at ${cellRef(obvious.r, obvious.c)} has multiple paths connected to it. Dead ends should only have one path.`,
                    highlight: { type: 'cell', r: obvious.r, c: obvious.c }
                };
            }
        }

        // Non-obvious mistake - only report if not in onlyObvious mode
        if (!onlyObvious) {
            return {
                message: `There's a mistake somewhere on the board. Review your work carefully.`,
                highlight: null
            };
        }
    }
    return null;
}

// Hint 2: Row or column can be finished (walls or paths complete)
function hintRowColComplete(merged) {
    // Check rows
    for (let r = 0; r < SIZE; r++) {
        const { walls, paths, target, expectedPaths } = getRowCounts(merged, r);
        // Check if there are empty cells to fill
        const emptyCells = [];
        for (let c = 0; c < SIZE; c++) {
            const idx = r * SIZE + c;
            if (merged[idx] === 0 && !isFixedPath(r, c)) emptyCells.push(c);
        }
        if (emptyCells.length === 0) continue;

        if (walls === target) {
            return {
                message: `Row ${rowToNumber(r)} has all its walls. The remaining cells must be paths.`,
                highlight: { type: 'row', index: r }
            };
        }
        if (paths === expectedPaths) {
            return {
                message: `Row ${rowToNumber(r)} has all its paths. The remaining cells must be walls.`,
                highlight: { type: 'row', index: r }
            };
        }
    }

    // Check columns
    for (let c = 0; c < SIZE; c++) {
        const { walls, paths, target, expectedPaths } = getColCounts(merged, c);
        // Check if there are empty cells to fill
        const emptyCells = [];
        for (let r = 0; r < SIZE; r++) {
            const idx = r * SIZE + c;
            if (merged[idx] === 0 && !isFixedPath(r, c)) emptyCells.push(r);
        }
        if (emptyCells.length === 0) continue;

        if (walls === target) {
            return {
                message: `Column ${colToLetter(c)} has all its walls. The remaining cells must be paths.`,
                highlight: { type: 'col', index: c }
            };
        }
        if (paths === expectedPaths) {
            return {
                message: `Column ${colToLetter(c)} has all its paths. The remaining cells must be walls.`,
                highlight: { type: 'col', index: c }
            };
        }
    }
    return null;
}

// Hint 3: Dead end can be finished (has 1 path or 3 walls around it)
function hintDeadEndCanBeFinished(merged) {
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            if (!isTargetDeadEnd(r, c)) continue;

            let pathCount = 0;
            let wallCount = 0;
            let emptyCount = 0;
            const emptyCells = [];

            for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
                const nr = r + dr, nc = c + dc;
                if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) {
                    wallCount++; // Edge of grid counts as wall
                    continue;
                }
                const nIdx = nr * SIZE + nc;
                if (merged[nIdx] === 1) {
                    wallCount++;
                } else if (merged[nIdx] === 2 || isFixedPath(nr, nc)) {
                    pathCount++;
                } else {
                    emptyCount++;
                    emptyCells.push({ r: nr, c: nc });
                }
            }

            // Dead end has exactly 1 path - remaining empty neighbors must be walls
            if (pathCount === 1 && emptyCount > 0) {
                const cellList = formatCellList(emptyCells);
                const cellWord = emptyCount === 1 ? 'Cell' : 'Cells';
                const wallWord = emptyCount === 1 ? 'a wall' : 'walls';
                const mustWord = emptyCount === 1 ? 'must' : emptyCount == 2 ? 'must both' : 'must all';
                return {
                    message: `${cellWord} ${cellList} ${mustWord} be ${wallWord}. The dead end at ${cellRef(r, c)} already has its one path.`,
                    highlight: emptyCount === 1
                        ? { type: 'cell', r: emptyCells[0].r, c: emptyCells[0].c }
                        : { type: 'cells', cells: emptyCells }
                };
            }

            // Dead end has 3 walls - the remaining empty neighbor must be a path
            if (wallCount === 3 && emptyCount === 1 && pathCount === 0) {
                const cell = emptyCells[0];
                return {
                    message: `Cell ${cellRef(cell.r, cell.c)} must be a path. It's the only way to connect the dead end at ${cellRef(r, c)}.`,
                    highlight: { type: 'cell', r: cell.r, c: cell.c }
                };
            }
        }
    }
    return null;
}
// Hint 4: Data cache vault constraints - some cells are guaranteed to be in the vault
// Based on edges, walls, AND row/column wall requirements, we can determine which vault positions are valid
function hintCacheNearEdge(merged) {
    // Check if there's a stockpile (data cache)
    if (!stockpilePos) return null;

    const cacheR = stockpilePos.r;
    const cacheC = stockpilePos.c;

    // Check if a 3x3 vault position is valid
    function isValidVaultPosition(vr, vc) {
        // Must be within grid
        if (vr < 0 || vr + 2 >= SIZE || vc < 0 || vc + 2 >= SIZE) return false;

        // Must contain the cache
        if (cacheR < vr || cacheR > vr + 2 || cacheC < vc || cacheC > vc + 2) return false;

        // Must not have any walls inside the 3x3 area
        for (let dr = 0; dr < 3; dr++) {
            for (let dc = 0; dc < 3; dc++) {
                const idx = (vr + dr) * SIZE + (vc + dc);
                if (merged[idx] === 1) return false; // Wall inside vault
            }
        }

        // Check if any row in the vault requires too many walls to fit outside the vault
        // If vault is here, these 3 columns must be paths in this row
        // So all remaining walls must fit in the other SIZE-3 columns
        for (let dr = 0; dr < 3; dr++) {
            const r = vr + dr;
            const { target: rowTarget } = getRowCounts(merged, r);
            // Count walls already placed outside the vault columns
            // Count empty cells outside the vault columns (where walls could still go)
            let wallsOutside = 0;
            let emptyOutside = 0;
            for (let c = 0; c < SIZE; c++) {
                if (c >= vc && c <= vc + 2) continue; // Skip vault columns
                const idx = r * SIZE + c;
                if (merged[idx] === 1) wallsOutside++;
                else if (merged[idx] === 0 && !isFixedPath(r, c)) emptyOutside++;
            }
            // If walls needed > walls we have + empty cells outside vault, can't fit
            if (rowTarget > wallsOutside + emptyOutside) return false;
        }

        // Same check for columns
        for (let dc = 0; dc < 3; dc++) {
            const c = vc + dc;
            const { target: colTarget } = getColCounts(merged, c);
            let wallsOutside = 0;
            let emptyOutside = 0;
            for (let r = 0; r < SIZE; r++) {
                if (r >= vr && r <= vr + 2) continue; // Skip vault rows
                const idx = r * SIZE + c;
                if (merged[idx] === 1) wallsOutside++;
                else if (merged[idx] === 0 && !isFixedPath(r, c)) emptyOutside++;
            }
            if (colTarget > wallsOutside + emptyOutside) return false;
        }

        return true;
    }

    // Find all valid vault positions
    const validVaults = [];
    for (let vr = Math.max(0, cacheR - 2); vr <= Math.min(SIZE - 3, cacheR); vr++) {
        for (let vc = Math.max(0, cacheC - 2); vc <= Math.min(SIZE - 3, cacheC); vc++) {
            if (isValidVaultPosition(vr, vc)) {
                validVaults.push({ r: vr, c: vc });
            }
        }
    }

    if (validVaults.length === 0) return null; // No valid vaults (shouldn't happen in valid puzzle)

    // Find cells that are in ALL valid vault positions
    const guaranteedPaths = [];

    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            // Check if this cell is in every valid vault
            let inAllVaults = true;

            for (const vault of validVaults) {
                if (r < vault.r || r > vault.r + 2 || c < vault.c || c > vault.c + 2) {
                    inAllVaults = false;
                    break;
                }
            }

            if (inAllVaults) {
                const idx = r * SIZE + c;
                // Only suggest if cell is empty (not already a path or wall)
                if (merged[idx] === 0 && !isFixedPath(r, c)) {
                    guaranteedPaths.push({ r, c });
                }
            }
        }
    }

    if (guaranteedPaths.length === 0) return null;

    // Return hint for the guaranteed path cells
    if (guaranteedPaths.length === 1) {
        const cell = guaranteedPaths[0];
        return {
            message: `Cell ${cellRef(cell.r, cell.c)} must be a path. Any valid vault containing the data cache must include this cell.`,
            highlight: { type: 'cell', r: cell.r, c: cell.c }
        };
    } else {
        const cellList = formatCellList(guaranteedPaths);
        return {
            message: `Cells ${cellList} must be paths. Any valid vault containing the data cache must include these cells.`,
            highlight: { type: 'cells', cells: guaranteedPaths }
        };
    }
}

// Hint 5: 2x2 area with 3 paths
function hint2x2With3Paths(merged) {
    const cell = find2x2With3Paths(merged);
    if (cell) {
        return {
            message: `Cell ${cellRef(cell.r, cell.c)} must be a wall to prevent a 2×2 path block.`,
            highlight: { type: 'cell', r: cell.r, c: cell.c }
        };
    }
    return null;
}

// Hint 4: Path flanked by walls must be extended
// E.g., __WPW___ means the cell below P must be a path (otherwise P would be a dead end)
function hintPathMustExtend(merged) {
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            const idx = r * SIZE + c;
            // Check if this is a path (user-placed or fixed)
            if (merged[idx] !== 2 && !isFixedPath(r, c)) continue;
            // Skip dead ends - they're supposed to have only one exit
            if (isTargetDeadEnd(r, c)) continue;

            let wallCount = 0;
            let emptyCount = 0;
            let pathCount = 0;
            const emptyCells = [];

            for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
                const nr = r + dr, nc = c + dc;
                if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) {
                    wallCount++; // Edge counts as wall
                    continue;
                }
                const nIdx = nr * SIZE + nc;
                if (merged[nIdx] === 1) {
                    wallCount++;
                } else if (merged[nIdx] === 2 || isFixedPath(nr, nc)) {
                    pathCount++;
                } else {
                    emptyCount++;
                    emptyCells.push({ r: nr, c: nc });
                }
            }

            // If path has 3 walls and 1 empty, that empty must be a path
            // (otherwise this non-dead-end path would only have one exit)
            if (wallCount === 3 && emptyCount === 1) {
                const cell = emptyCells[0];
                return {
                    message: `Cell ${cellRef(cell.r, cell.c)} must be a path. Otherwise the path at ${cellRef(r, c)} would be a dead end.`,
                    highlight: { type: 'cell', r: cell.r, c: cell.c }
                };
            }

            // If path has 2 walls, 1 path, and 1 empty, that empty must be a path
            // (paths need 2 connections unless they're dead ends)
            if (wallCount === 2 && pathCount === 1 && emptyCount === 1) {
                const cell = emptyCells[0];
                return {
                    message: `Cell ${cellRef(cell.r, cell.c)} must be a path. The path at ${cellRef(r, c)} needs another connection.`,
                    highlight: { type: 'cell', r: cell.r, c: cell.c }
                };
            }
        }
    }
    return null;
}

// Hint 5: Corner with two flanking dead ends must be a wall
// E.g., if A2 and B1 are dead ends, A1 must be a wall (a path there would be cut off)
function hintCornerFlankingDeadEnds(merged) {
    // Check all four corners
    const corners = [
        { r: 0, c: 0, flank1: { r: 0, c: 1 }, flank2: { r: 1, c: 0 } },           // Top-left
        { r: 0, c: SIZE - 1, flank1: { r: 0, c: SIZE - 2 }, flank2: { r: 1, c: SIZE - 1 } }, // Top-right
        { r: SIZE - 1, c: 0, flank1: { r: SIZE - 1, c: 1 }, flank2: { r: SIZE - 2, c: 0 } }, // Bottom-left
        { r: SIZE - 1, c: SIZE - 1, flank1: { r: SIZE - 1, c: SIZE - 2 }, flank2: { r: SIZE - 2, c: SIZE - 1 } } // Bottom-right
    ];

    for (const corner of corners) {
        const { r, c, flank1, flank2 } = corner;
        const idx = r * SIZE + c;

        // Only check if corner is empty
        if (merged[idx] !== 0 || isFixedPath(r, c)) continue;

        // Check if both flanking cells are dead ends
        if (isTargetDeadEnd(flank1.r, flank1.c) && isTargetDeadEnd(flank2.r, flank2.c)) {
            return {
                message: `Cell ${cellRef(r, c)} must be a wall. The dead ends at ${cellRef(flank1.r, flank1.c)} and ${cellRef(flank2.r, flank2.c)} would cut off a path there.`,
                highlight: { type: 'cell', r, c }
            };
        }
    }
    return null;
}

// Hint 5: Edge row/column with exactly 1 wall remaining - corners must have path next to them
// E.g., on top row with 1 wall needed: ________ -> _P____P_ (corners can't be dead ends)
function hintEdgeCornerDeadEnd(merged) {
    const edgeRows = [0, SIZE - 1];
    const edgeCols = [0, SIZE - 1];

    // Check edge rows
    for (const r of edgeRows) {
        const { walls, target } = getRowCounts(merged, r);
        const remaining = target - walls;
        if (remaining !== 1) continue; // Only applies when exactly 1 wall left

        // Check if corners are empty - if so, the cell next to them must be a path
        // Left corner (column 0)
        const leftIdx = r * SIZE + 0;
        if (merged[leftIdx] === 0 && !isFixedPath(r, 0)) {
            // Column 0 is empty, check column 1
            const checkC = 1;
            if (merged[r * SIZE + checkC] === 0 && !isFixedPath(r, checkC)) {
                return {
                    message: `Cell ${cellRef(r, checkC)} must be a path. A wall there would trap cell ${cellRef(r, 0)} as a dead end.`,
                    highlight: { type: 'cell', r, c: checkC }
                };
            }
        }

        // Right corner (column SIZE-1)
        const rightIdx = r * SIZE + (SIZE - 1);
        if (merged[rightIdx] === 0 && !isFixedPath(r, SIZE - 1)) {
            // Column SIZE-1 is empty, check column SIZE-2
            const checkC = SIZE - 2;
            if (merged[r * SIZE + checkC] === 0 && !isFixedPath(r, checkC)) {
                return {
                    message: `Cell ${cellRef(r, checkC)} must be a path. A wall there would trap cell ${cellRef(r, SIZE - 1)} as a dead end.`,
                    highlight: { type: 'cell', r, c: checkC }
                };
            }
        }
    }

    // Check edge columns
    for (const c of edgeCols) {
        const { walls, target } = getColCounts(merged, c);
        const remaining = target - walls;
        if (remaining !== 1) continue; // Only applies when exactly 1 wall left

        // Top corner (row 0)
        const topIdx = 0 * SIZE + c;
        if (merged[topIdx] === 0 && !isFixedPath(0, c)) {
            const checkR = 1;
            if (merged[checkR * SIZE + c] === 0 && !isFixedPath(checkR, c)) {
                return {
                    message: `Cell ${cellRef(checkR, c)} must be a path. A wall there would trap cell ${cellRef(0, c)} as a dead end.`,
                    highlight: { type: 'cell', r: checkR, c }
                };
            }
        }

        // Bottom corner (row SIZE-1)
        const bottomIdx = (SIZE - 1) * SIZE + c;
        if (merged[bottomIdx] === 0 && !isFixedPath(SIZE - 1, c)) {
            const checkR = SIZE - 2;
            if (merged[checkR * SIZE + c] === 0 && !isFixedPath(checkR, c)) {
                return {
                    message: `Cell ${cellRef(checkR, c)} must be a path. A wall there would trap cell ${cellRef(SIZE - 1, c)} as a dead end.`,
                    highlight: { type: 'cell', r: checkR, c }
                };
            }
        }
    }

    return null;
}

// Hint 5: Row/column needs N-1 walls, cells next to dead ends must be walls
function hintDeadEndAdjacent(merged) {
    // Check rows that need N-1 walls
    for (let r = 0; r < SIZE; r++) {
        const { walls, target } = getRowCounts(merged, r);
        if (target === SIZE - 1) {
            // Check adjacent rows for dead ends
            for (const adjR of [r - 1, r + 1]) {
                if (adjR < 0 || adjR >= SIZE) continue;
                for (let c = 0; c < SIZE; c++) {
                    if (isTargetDeadEnd(adjR, c)) {
                        const idx = r * SIZE + c;
                        if (merged[idx] === 0) {
                            return {
                                message: `Cell ${cellRef(r, c)} must be a wall. It's adjacent to a dead end, and row ${rowToNumber(r)} needs ${SIZE - 1} walls.`,
                                highlight: { type: 'cell', r, c }
                            };
                        }
                    }
                }
            }
        }
    }

    // Check columns that need N-1 walls
    for (let c = 0; c < SIZE; c++) {
        const { walls, target } = getColCounts(merged, c);
        if (target === SIZE - 1) {
            for (const adjC of [c - 1, c + 1]) {
                if (adjC < 0 || adjC >= SIZE) continue;
                for (let r = 0; r < SIZE; r++) {
                    if (isTargetDeadEnd(r, adjC)) {
                        const idx = r * SIZE + c;
                        if (merged[idx] === 0) {
                            return {
                                message: `Cell ${cellRef(r, c)} must be a wall. It's adjacent to a dead end, and column ${colToLetter(c)} needs ${SIZE - 1} walls.`,
                                highlight: { type: 'cell', r, c }
                            };
                        }
                    }
                }
            }
        }
    }
    return null;
}

// Hint 6: Dead end in edge row/col with only 1 more wall needed
// The wall must be adjacent to the dead end, so all other empty cells must be paths
// Only applies to dead ends with 2 possible exits within the row/col (not corner dead ends)
function hintEdgeDeadEndOneWall(merged) {
    // Check edge rows (top and bottom)
    for (const r of [0, SIZE - 1]) {
        const { walls, target } = getRowCounts(merged, r);
        if (target - walls !== 1) continue;

        // Find dead ends in this row that have 2 possible exits (not at corners)
        for (let c = 0; c < SIZE; c++) {
            if (!isTargetDeadEnd(r, c)) continue;

            // Skip corner dead ends - they only have 1 exit within the row
            if (c === 0 || c === SIZE - 1) continue;

            // Found a non-corner dead end in an edge row needing 1 wall
            // Collect all non-adjacent empty cells that must be paths
            const pathCells = [];
            for (let cc = 0; cc < SIZE; cc++) {
                if (Math.abs(cc - c) <= 1) continue; // Skip adjacent cells
                const idx = r * SIZE + cc;
                if (merged[idx] === 0 && !isFixedPath(r, cc)) {
                    pathCells.push({ r, c: cc });
                }
            }
            if (pathCells.length > 0) {
                const cellsText = pathCells.length === 1 ? `Cell ${formatCellList(pathCells)} must be a path` : `Cells ${formatCellList(pathCells)} must be paths`;
                return {
                    message: `${cellsText}. Row ${rowToNumber(r)} needs only 1 more wall, which must be adjacent to the dead end at ${cellRef(r, c)}.`,
                    highlight: pathCells.length === 1 ? { type: 'cell', r: pathCells[0].r, c: pathCells[0].c } : { type: 'cells', cells: pathCells }
                };
            }
        }
    }

    // Check edge columns (left and right)
    for (const c of [0, SIZE - 1]) {
        const { walls, target } = getColCounts(merged, c);
        if (target - walls !== 1) continue;

        // Find dead ends in this column that have 2 possible exits (not at corners)
        for (let r = 0; r < SIZE; r++) {
            if (!isTargetDeadEnd(r, c)) continue;

            // Skip corner dead ends - they only have 1 exit within the column
            if (r === 0 || r === SIZE - 1) continue;

            // Found a non-corner dead end in an edge column needing 1 wall
            // Collect all non-adjacent empty cells that must be paths
            const pathCells = [];
            for (let rr = 0; rr < SIZE; rr++) {
                if (Math.abs(rr - r) <= 1) continue; // Skip adjacent cells
                const idx = rr * SIZE + c;
                if (merged[idx] === 0 && !isFixedPath(rr, c)) {
                    pathCells.push({ r: rr, c });
                }
            }
            if (pathCells.length > 0) {
                const cellsText = pathCells.length === 1 ? `Cell ${formatCellList(pathCells)} must be a path` : `Cells ${formatCellList(pathCells)} must be paths`;
                return {
                    message: `${cellsText}. Column ${colToLetter(c)} needs only 1 more wall, which must be adjacent to the dead end at ${cellRef(r, c)}.`,
                    highlight: pathCells.length === 1 ? { type: 'cell', r: pathCells[0].r, c: pathCells[0].c } : { type: 'cells', cells: pathCells }
                };
            }
        }
    }
    return null;
}

// Hint 7: Fallback - suggest forking
function hintFork() {
    return {
        message: "No obvious moves found. Try a fork to make an educated guess!",
        highlight: null
    };
}

// Main hint function - returns the first applicable hint
function getHint() {
    const merged = getMergedBoard();
    const inFork = currentIdx > 0;

    // Run hints in priority order
    // When in a fork, only report obvious mistakes (not "unknown error somewhere")
    const hints = [
        () => hintCheckMistakes(merged, inFork), // Pass onlyObvious=true when in fork
        () => hintRowColComplete(merged),
        () => hintDeadEndCanBeFinished(merged),
        () => hintCacheNearEdge(merged),
        () => hintPathMustExtend(merged),
        () => hint2x2With3Paths(merged),
        () => hintCornerFlankingDeadEnds(merged),
        () => hintEdgeDeadEndOneWall(merged),
        () => hintEdgeCornerDeadEnd(merged),
        () => hintDeadEndAdjacent(merged),
        () => hintFork()
    ];

    for (const hintFn of hints) {
        const hint = hintFn();
        if (hint) return hint;
    }

    return hintFork();
}

// Store current hint for highlighting after dialog closes
let currentHint = null;

// Clear any existing hint highlights
// Timeout for auto-clearing hint highlights
let hintHighlightTimeout = null;

function clearHintHighlights() {
    // Clear any pending timeout
    if (hintHighlightTimeout) {
        clearTimeout(hintHighlightTimeout);
        hintHighlightTimeout = null;
    }
    // Clear cell highlights
    document.querySelectorAll('.hint-highlight-cell').forEach(el => {
        el.classList.remove('hint-highlight-cell');
    });
    // Clear row highlights
    document.querySelectorAll('.hint-highlight-row').forEach(el => {
        el.classList.remove('hint-highlight-row');
    });
    // Clear column highlights
    document.querySelectorAll('.hint-highlight-col').forEach(el => {
        el.classList.remove('hint-highlight-col');
    });
    // Clear label highlights
    document.querySelectorAll('.hint-highlight-label').forEach(el => {
        el.classList.remove('hint-highlight-label');
    });
}

// Helper to add highlight class with animation restart
function addHighlightClass(el, className) {
    // Remove and re-add to restart animation
    el.classList.remove(className);
    // Force reflow to restart animation
    void el.offsetWidth;
    el.classList.add(className);
}

// Apply hint highlight based on hint type
function applyHintHighlight(hint) {
    if (!hint || !hint.highlight) return;

    const hl = hint.highlight;
    const gridCells = document.getElementById('mainGrid').querySelectorAll('.cell');

    if (hl.type === 'cell') {
        const idx = hl.r * SIZE + hl.c;
        if (gridCells[idx]) {
            addHighlightClass(gridCells[idx], 'hint-highlight-cell');
        }
    } else if (hl.type === 'cells') {
        // Highlight multiple cells
        for (const cell of hl.cells) {
            const idx = cell.r * SIZE + cell.c;
            if (gridCells[idx]) {
                addHighlightClass(gridCells[idx], 'hint-highlight-cell');
            }
        }
    } else if (hl.type === 'row') {
        // Highlight all cells in the row
        for (let c = 0; c < SIZE; c++) {
            const idx = hl.index * SIZE + c;
            if (gridCells[idx]) {
                addHighlightClass(gridCells[idx], 'hint-highlight-row');
            }
        }
        // Highlight the row label
        const rowLabels = document.querySelectorAll('.row-labels .count-neon');
        if (rowLabels[hl.index]) {
            addHighlightClass(rowLabels[hl.index], 'hint-highlight-label');
        }
    } else if (hl.type === 'col') {
        // Highlight all cells in the column
        for (let r = 0; r < SIZE; r++) {
            const idx = r * SIZE + hl.index;
            if (gridCells[idx]) {
                addHighlightClass(gridCells[idx], 'hint-highlight-col');
            }
        }
        // Highlight the column label
        const colLabels = document.querySelectorAll('.col-labels .count-neon');
        if (colLabels[hl.index]) {
            addHighlightClass(colLabels[hl.index], 'hint-highlight-label');
        }
    }

    // Auto-clear highlights after animation completes (3 seconds for 3 pulses)
    hintHighlightTimeout = setTimeout(clearHintHighlights, 3000);
}

// Toast auto-hide timeout
let hintToastTimeout = null;

// Display hint as toast near the grid
function showHint(hint) {
    currentHint = hint;
    const toast = document.getElementById('hintToast');
    const message = document.getElementById('hintMessage');

    message.textContent = hint.message;

    // Determine which row to position near
    let targetRow = Math.floor(SIZE / 2); // Default to middle

    if (hint.highlight) {
        if (hint.highlight.type === 'cell') {
            targetRow = hint.highlight.r;
        } else if (hint.highlight.type === 'cells' && hint.highlight.cells.length > 0) {
            // Use the topmost highlighted cell
            targetRow = Math.min(...hint.highlight.cells.map(c => c.r));
        } else if (hint.highlight.type === 'row') {
            targetRow = hint.highlight.index;
        } else if (hint.highlight.type === 'col') {
            targetRow = 0; // Top for column hints
        }
    }

    // Position toast above the target row (as percentage of grid)
    // If target is in top half, position below; otherwise position above
    const cellSize = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--cell-size')) || 40;
    let topPosition;

    if (targetRow <= SIZE / 2) {
        // Target in top half - position toast below the highlighted area
        topPosition = (targetRow + 1) * (cellSize + 1) + 10;
    } else {
        // Target in bottom half - position toast above the highlighted area
        topPosition = targetRow * (cellSize + 1) - 50;
    }

    // Clamp to reasonable bounds
    topPosition = Math.max(-70, Math.min(topPosition, SIZE * (cellSize + 1) - 40));
    toast.style.top = `${topPosition}px`;

    // Show toast and apply highlight immediately
    toast.classList.remove('fading');
    toast.classList.add('visible');

    clearHintHighlights();
    applyHintHighlight(hint);

    // Clear any existing timeout
    if (hintToastTimeout) {
        clearTimeout(hintToastTimeout);
    }

    // Auto-fade after 5 seconds
    hintToastTimeout = setTimeout(() => {
        hideHintToast();
    }, 5000);
}

// Hide the hint toast
function hideHintToast() {
    const toast = document.getElementById('hintToast');
    toast.classList.add('fading');

    setTimeout(() => {
        toast.classList.remove('visible', 'fading');
        currentHint = null;
    }, 300);

    if (hintToastTimeout) {
        clearTimeout(hintToastTimeout);
        hintToastTimeout = null;
    }
}

// Click on toast to dismiss
document.getElementById('hintToast').onclick = () => {
    hideHintToast();
};

// Hint button click handler
document.getElementById('hintBtn').onclick = () => {
    if (isWon) return;
    ChipSound.click();
    clearHintHighlights();
    const hint = getHint();
    showHint(hint);
};
// Cookie helper functions for briefing preference
function setBriefingCookie(dontShow) {
    const days = 365;
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `hideBriefingOnStartup=${dontShow ? '1' : '0'}; expires=${date.toUTCString()}; path=/; SameSite=Lax`;
}

function getBriefingCookie() {
    const match = document.cookie.match(/(?:^|; )hideBriefingOnStartup=([^;]*)/);
    return match ? match[1] === '1' : false;
}

// Show briefing dialog and sync checkbox state with cookie
function showBriefingDialog() {
    const checkbox = document.getElementById('dontShowBriefingCheckbox');
    if (checkbox) {
        checkbox.checked = getBriefingCookie();
    }
    document.getElementById('briefingOverlay').style.display = 'flex';
}

// Show briefing on startup if not disabled
function showBriefingOnStartup() {
    if (!getBriefingCookie()) {
        showBriefingDialog();
    }
}

document.getElementById('briefingBtn').onclick = () => {
    ChipSound.click();
    document.getElementById('menuOverlay').classList.remove('visible');
    showBriefingDialog();
};
document.getElementById('closeBriefingBtn').onclick = () => {
    ChipSound.click();
    const checkbox = document.getElementById('dontShowBriefingCheckbox');
    if (checkbox) {
        setBriefingCookie(checkbox.checked);
    }
    document.getElementById('briefingOverlay').style.display = 'none';
};

// Slide-in menu
document.getElementById('menuBtn').onclick = () => {
    ChipSound.click();
    document.getElementById('menuOverlay').classList.add('visible');
};
function closeMenu() {
    document.getElementById('menuOverlay').classList.remove('visible');
}
document.getElementById('menuCloseBtn').onclick = () => {
    ChipSound.click();
    closeMenu();
};
document.getElementById('menuOverlay').onclick = (e) => {
    if (e.target.id === 'menuOverlay') {
        ChipSound.click();
        closeMenu();
    }
};

// Sound toggle button
document.getElementById('soundToggleBtn').onclick = () => {
    const muted = ChipSound.toggleMute();
    const btn = document.getElementById('soundToggleBtn');
    const icon = document.getElementById('soundIcon');
    if (muted) {
        btn.classList.add('muted');
        icon.textContent = '🔇';
    } else {
        btn.classList.remove('muted');
        icon.textContent = '🔊';
        ChipSound.click(); // Play a sound to confirm unmute
    }
    saveUserPreferences();
};

// Music toggle button
document.getElementById('musicToggleBtn').onclick = () => {
    const btn = document.getElementById('musicToggleBtn');
    const icon = document.getElementById('musicIcon');
    if (ChipMusic.isPlaying()) {
        ChipMusic.stop();
        btn.classList.add('muted');
        icon.textContent = '🎵';
        btn.title = 'Play Music';
    } else {
        ChipMusic.start();
        btn.classList.remove('muted');
        icon.textContent = '🎶';
        btn.title = 'Stop Music';
    }
    saveUserPreferences();
};

// User preferences persistence (audio, decrypt overlay)
function loadUserPreferences() {
    const match = document.cookie.match(/neuralReconPrefs=([^;]+)/);
    if (match) {
        try {
            const saved = JSON.parse(decodeURIComponent(match[1]));
            return saved;
        } catch (e) {
            console.warn('Failed to parse user preferences cookie');
        }
    }
    return { soundMuted: false, musicPlaying: true, decryptOverlay: false };
}

function saveUserPreferences() {
    const settings = {
        soundMuted: ChipSound.getMuted(),
        musicPlaying: ChipMusic.isPlaying(),
        decryptOverlay: showKey
    };
    const expires = new Date(Date.now() + 365 * 5 * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `neuralReconPrefs=${encodeURIComponent(JSON.stringify(settings))}; expires=${expires}; path=/; SameSite=Lax`;
}

// Assist Mode toggle system with cookie persistence
function loadAssistSettings() {
    const match = document.cookie.match(/neuralReconAssist=([^;]+)/);
    if (match) {
        try {
            const saved = JSON.parse(decodeURIComponent(match[1]));
            // Merge saved settings with defaults (in case new settings are added)
            Object.assign(assistSettings, saved);
            if (saved.visualHints) Object.assign(assistSettings.visualHints, saved.visualHints);
            if (saved.autoFill) Object.assign(assistSettings.autoFill, saved.autoFill);
        } catch (e) {
            console.warn('Failed to parse assist settings cookie');
        }
    }
    updateAssistUI();
}

function saveAssistSettings() {
    const expires = new Date(Date.now() + 365 * 5 * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `neuralReconAssist=${encodeURIComponent(JSON.stringify(assistSettings))}; expires=${expires}; path=/; SameSite=Lax`;
}

function updateToggleUI(btnId, stateId, enabled) {
    const btn = document.getElementById(btnId);
    const state = document.getElementById(stateId);
    if (btn && state) {
        btn.classList.toggle('off', !enabled);
        state.textContent = enabled ? 'ON' : 'OFF';
        state.classList.toggle('off-state', !enabled);
    }
}

function updateAssistUI() {
    // Update all toggle states
    updateToggleUI('assistModeBtn', 'assistModeState', assistSettings.enabled);
    updateToggleUI('visualHintsBtn', 'visualHintsState', assistSettings.visualHints.enabled);
    updateToggleUI('errorIndicatorsBtn', 'errorIndicatorsState', assistSettings.visualHints.errorIndicators);
    updateToggleUI('progressIndicatorsBtn', 'progressIndicatorsState', assistSettings.visualHints.progressIndicators);
    updateToggleUI('autoFillBtn', 'autoFillState', assistSettings.autoFill.enabled);
    updateToggleUI('deadEndFillBtn', 'deadEndFillState', assistSettings.autoFill.deadEndFill);
    updateToggleUI('wallCompletionBtn', 'wallCompletionState', assistSettings.autoFill.wallCompletion);
    updateToggleUI('pathCompletionBtn', 'pathCompletionState', assistSettings.autoFill.pathCompletion);
}

// Propagate state changes down the hierarchy
// Note: pathCompletion is never auto-toggled by parents - it must be explicitly enabled
function propagateAssistState(enabled) {
    assistSettings.visualHints.enabled = enabled;
    assistSettings.visualHints.errorIndicators = enabled;
    assistSettings.visualHints.progressIndicators = enabled;
    assistSettings.autoFill.enabled = enabled;
    assistSettings.autoFill.deadEndFill = enabled;
    assistSettings.autoFill.wallCompletion = enabled;
    // pathCompletion is not propagated - must be explicitly toggled
}

function propagateVisualHintsState(enabled) {
    assistSettings.visualHints.errorIndicators = enabled;
    assistSettings.visualHints.progressIndicators = enabled;
}

function propagateAutoFillState(enabled) {
    assistSettings.autoFill.deadEndFill = enabled;
    assistSettings.autoFill.wallCompletion = enabled;
    // pathCompletion is not propagated - must be explicitly toggled
}

// Check if all children are enabled to update parent state
function updateParentStates() {
    // Update visualHints.enabled based on children
    assistSettings.visualHints.enabled = assistSettings.visualHints.errorIndicators || assistSettings.visualHints.progressIndicators;
    // Update autoFill.enabled based on children
    assistSettings.autoFill.enabled = assistSettings.autoFill.deadEndFill || assistSettings.autoFill.wallCompletion || assistSettings.autoFill.pathCompletion;
    // Update master enabled based on children
    assistSettings.enabled = assistSettings.visualHints.enabled || assistSettings.autoFill.enabled;
}

// Expand/collapse handlers
function setupExpandSection(sectionId, btnId) {
    const btn = document.getElementById(btnId);
    if (!btn) return;

    btn.addEventListener('click', (e) => {
        // Only toggle expand if clicking on the expand icon area
        const rect = btn.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        // If click is in the first 40px (icon area), toggle expand
        if (clickX < 40) {
            e.stopPropagation();
            const section = btn.closest('.menu-expand-section');
            section.classList.toggle('expanded');
            ChipSound.click();
        }
    });
}

// Toggle handlers
document.getElementById('assistModeBtn').onclick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (e.clientX - rect.left < 40) return; // Handled by expand listener
    ChipSound.click();
    assistSettings.enabled = !assistSettings.enabled;
    propagateAssistState(assistSettings.enabled);
    saveAssistSettings();
    updateAssistUI();
    update();
};

document.getElementById('visualHintsBtn').onclick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (e.clientX - rect.left < 40) return;
    ChipSound.click();
    assistSettings.visualHints.enabled = !assistSettings.visualHints.enabled;
    propagateVisualHintsState(assistSettings.visualHints.enabled);
    updateParentStates();
    saveAssistSettings();
    updateAssistUI();
    update();
};

document.getElementById('errorIndicatorsBtn').onclick = () => {
    ChipSound.click();
    assistSettings.visualHints.errorIndicators = !assistSettings.visualHints.errorIndicators;
    updateParentStates();
    saveAssistSettings();
    updateAssistUI();
    update();
};

document.getElementById('progressIndicatorsBtn').onclick = () => {
    ChipSound.click();
    assistSettings.visualHints.progressIndicators = !assistSettings.visualHints.progressIndicators;
    updateParentStates();
    saveAssistSettings();
    updateAssistUI();
    update();
};

document.getElementById('autoFillBtn').onclick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (e.clientX - rect.left < 40) return;
    ChipSound.click();
    assistSettings.autoFill.enabled = !assistSettings.autoFill.enabled;
    propagateAutoFillState(assistSettings.autoFill.enabled);
    updateParentStates();
    saveAssistSettings();
    updateAssistUI();
    update();
};

document.getElementById('deadEndFillBtn').onclick = () => {
    ChipSound.click();
    assistSettings.autoFill.deadEndFill = !assistSettings.autoFill.deadEndFill;
    updateParentStates();
    saveAssistSettings();
    updateAssistUI();
    update();
};

document.getElementById('wallCompletionBtn').onclick = () => {
    ChipSound.click();
    assistSettings.autoFill.wallCompletion = !assistSettings.autoFill.wallCompletion;
    updateParentStates();
    saveAssistSettings();
    updateAssistUI();
    update();
};

document.getElementById('pathCompletionBtn').onclick = () => {
    ChipSound.click();
    assistSettings.autoFill.pathCompletion = !assistSettings.autoFill.pathCompletion;
    updateParentStates();
    saveAssistSettings();
    updateAssistUI();
    update();
};

// Setup expand sections
setupExpandSection('assistModeContent', 'assistModeBtn');
setupExpandSection('visualHintsContent', 'visualHintsBtn');
setupExpandSection('autoFillContent', 'autoFillBtn');

// Load assist settings on startup
loadAssistSettings();

// Stats dialog
let currentStatsSize = 4;

function updateSizeStats(size) {
    const stats = PlayerStats.get();
    const sizeStats = stats.bySize[String(size)] || { wins: 0, bestStreak: 0, fastestTime: null, fewestMoves: null };

    document.getElementById('statSizeWins').textContent = sizeStats.wins;
    document.getElementById('statSizeStreak').textContent = sizeStats.bestStreak;
    document.getElementById('statSizeFastest').textContent = PlayerStats.formatTime(sizeStats.fastestTime);
    document.getElementById('statSizeMoves').textContent = sizeStats.fewestMoves !== null ? sizeStats.fewestMoves : '--';
}

function updateStatsDisplay() {
    const stats = PlayerStats.get();
    document.getElementById('statTotalWins').textContent = stats.totalWins;
    document.getElementById('statTotalTime').textContent = PlayerStats.formatTotalTime(stats.totalTimePlayed);
    document.getElementById('statTotalMoves').textContent = stats.totalMoves;

    // Update the currently selected size tab
    updateSizeStats(currentStatsSize);
}

// Stats size tab switching
document.querySelectorAll('.stats-tab').forEach(tab => {
    tab.onclick = () => {
        ChipSound.click();
        document.querySelectorAll('.stats-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentStatsSize = parseInt(tab.dataset.size);
        updateSizeStats(currentStatsSize);
    };
});

document.getElementById('statsBtn').onclick = () => {
    ChipSound.click();
    document.getElementById('menuOverlay').classList.remove('visible');
    // Set active tab to current puzzle size
    currentStatsSize = SIZE;
    document.querySelectorAll('.stats-tab').forEach(t => {
        t.classList.toggle('active', parseInt(t.dataset.size) === SIZE);
    });
    updateStatsDisplay();
    document.getElementById('statsOverlay').classList.add('visible');
};

document.getElementById('statsCloseBtn').onclick = () => {
    ChipSound.click();
    document.getElementById('statsOverlay').classList.remove('visible');
};

// Clear stats with dialog confirmation
const clearStatsDialog = document.getElementById('clearStatsDialog');

document.getElementById('statsClearBtn').onclick = () => {
    ChipSound.click();
    clearStatsDialog.showModal();
};

document.getElementById('clearStatsCancelBtn').onclick = () => {
    ChipSound.click();
    clearStatsDialog.close();
};

document.getElementById('clearStatsConfirmBtn').onclick = () => {
    ChipSound.click();
    PlayerStats.clear();
    winStreak = 0; // Reset current streak too
    updateStatsDisplay();
    clearStatsDialog.close();
};

// Close dialog when clicking backdrop
clearStatsDialog.addEventListener('click', (e) => {
    if (e.target === clearStatsDialog) {
        ChipSound.click();
        clearStatsDialog.close();
    }
});

// Close stats overlay when clicking outside
document.getElementById('statsOverlay').onclick = (e) => {
    if (e.target.id === 'statsOverlay') {
        ChipSound.click();
        document.getElementById('statsOverlay').classList.remove('visible');
    }
};

// Tab switching for briefing modal
document.querySelectorAll('.briefing-tab').forEach(tab => {
    tab.onclick = () => {
        ChipSound.click();
        document.querySelectorAll('.briefing-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.briefing-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
    };
});

// Mode button switching
document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.onclick = () => {
        ChipSound.click();
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        drawingMode = btn.dataset.mode;
    };
});

// Theme selector
const themeSelect = document.getElementById('themeSelect');
if (themeSelect) {
    themeSelect.onchange = () => {
        ChipSound.click();
        if (typeof ThemeManager !== 'undefined') {
            ThemeManager.set(themeSelect.value);
            // Update colors array from theme
            const theme = ThemeManager.current();
            if (theme?.layerColors) {
                colors = [...theme.layerColors];
            }
            // Re-render with new theme
            updateButtonStates();
            update();
        }
    };
}

// Initialize theme system and game
// Update briefing text based on theme terminology
function updateBriefingTerminology(theme) {
    if (!theme?.terminology) return;
    const t = theme.terminology;

    // Update briefing title
    const briefingTitle = document.getElementById('briefingTitle');
    if (briefingTitle && t.briefingTitle) briefingTitle.textContent = t.briefingTitle;

    // Update stockpile description
    const stockpileDesc = document.getElementById('stockpileDesc');
    if (stockpileDesc && t.stockpileDesc) stockpileDesc.textContent = t.stockpileDesc;

    // Update vault description (keeping the stockpile tag)
    const vaultDesc = document.getElementById('vaultDesc');
    if (vaultDesc && t.vaultDesc) {
        vaultDesc.innerHTML = t.vaultDesc.replace(
            /Stockpile|Data Stockpile|Beehive/gi,
            `<span class="briefing-tag theme-stockpile">${t.stockpile}</span>`
        );
    }

    // Update all theme-specific spans
    document.querySelectorAll('.theme-wall').forEach(el => el.textContent = t.wall || 'Wall');
    document.querySelectorAll('.theme-path').forEach(el => el.textContent = t.path || 'Path');
    document.querySelectorAll('.theme-deadend').forEach(el => el.textContent = t.deadEnd || 'Dead End');
    document.querySelectorAll('.theme-stockpile').forEach(el => el.textContent = t.stockpile || 'Stockpile');
    document.querySelectorAll('.theme-vault').forEach(el => el.textContent = t.vault || 'Vault');
    document.querySelectorAll('.theme-fork').forEach(el => el.textContent = t.fork || 'Fork');
    document.querySelectorAll('.theme-commit').forEach(el => el.textContent = t.commit || 'Commit');
    document.querySelectorAll('.theme-discard').forEach(el => el.textContent = t.discard || 'Discard');
}

window.onload = () => {
    // Initialize theme system if available
    if (typeof ThemeManager !== 'undefined') {
        ThemeManager.loadSaved('cyberpunk');

        // Update colors array from loaded theme
        const theme = ThemeManager.current();
        if (theme?.layerColors) {
            colors = [...theme.layerColors];
        }

        // Update briefing terminology
        updateBriefingTerminology(theme);

        // Populate theme selector
        if (themeSelect) {
            const options = ThemeManager.getOptions();
            themeSelect.innerHTML = '';
            options.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt.id;
                option.textContent = opt.name;
                if (opt.id === theme?.id) option.selected = true;
                themeSelect.appendChild(option);
            });
        }

        // Listen for theme changes
        ThemeManager.onChange((newTheme) => {
            if (newTheme?.layerColors) {
                colors = [...newTheme.layerColors];
            }
            updateButtonStates();
            updateBriefingTerminology(newTheme);
        });
    }

    // Seed UI event handlers
    document.getElementById('copySeedBtn').onclick = () => {
        if (currentSeed) {
            navigator.clipboard.writeText(currentSeed).then(() => {
                const btn = document.getElementById('copySeedBtn');
                btn.textContent = '✓';
                setTimeout(() => btn.textContent = '📋', 1000);
            });
        }
    };

    document.getElementById('playSeedBtn').onclick = () => {
        const input = document.getElementById('seedInput');
        const seed = input.value.trim().toUpperCase();
        if (seed.length > 0) {
            ChipSound.click();
            closeMenu();
            init(true, seed);
            input.value = '';
        }
    };

    document.getElementById('seedInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('playSeedBtn').click();
        }
    });

    // Try to restore saved game state, otherwise start new game
    const savedState = GameState.load();
    if (savedState) {
        restoreGameState(savedState);
    } else {
        init(true);
    }

    // Save game state when page is about to unload
    window.addEventListener('beforeunload', () => {
        GameState.save();
    });

    // Also save periodically and after state changes via visibilitychange
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            GameState.save();
        }
    });

    // Show briefing on startup if not disabled by cookie
    showBriefingOnStartup();

    // Load user preferences and apply them
    const prefs = loadUserPreferences();
    const soundBtn = document.getElementById('soundToggleBtn');
    const soundIcon = document.getElementById('soundIcon');
    const musicBtn = document.getElementById('musicToggleBtn');
    const musicIcon = document.getElementById('musicIcon');
    const decryptBtn = document.getElementById('decryptToggleBtn');
    const decryptState = document.getElementById('decryptToggleState');

    // Apply sound mute setting
    if (prefs.soundMuted) {
        ChipSound.setMuted(true);
        if (soundBtn) soundBtn.classList.add('muted');
        if (soundIcon) soundIcon.textContent = '🔇';
    }

    // Apply music setting
    if (prefs.musicPlaying) {
        ChipMusic.start();
        if (musicBtn) {
            musicBtn.classList.remove('muted');
            musicBtn.title = 'Stop Music';
        }
        if (musicIcon) musicIcon.textContent = '🎶';
    } else {
        if (musicBtn) {
            musicBtn.classList.add('muted');
            musicBtn.title = 'Play Music';
        }
        if (musicIcon) musicIcon.textContent = '🎵';
    }

    // Apply decrypt overlay setting
    if (prefs.decryptOverlay) {
        showKey = true;
        if (decryptBtn) decryptBtn.classList.remove('off');
        if (decryptState) {
            decryptState.textContent = 'ON';
            decryptState.classList.remove('off-state');
        }
        update(); // Re-render grid to show overlay
    }
};