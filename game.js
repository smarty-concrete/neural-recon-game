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

// ============================================
// GAME CONFIGURATION CONSTANTS
// ============================================
const DATA_VAULT_UNLOCK_SIZE = 7; // Grid size at which data vaults are first introduced
const DATA_VAULT_FIRST_SEED = 'YT5EGJ'; // Seed for first puzzle when unlocking data vaults

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

// ============================================
// RESPONSIVE LAYOUT (board sizing)
// ============================================
// Goal: Board uses as much width as possible while never exceeding 90% of the
// available height under the top bars (header + mode strip).
//
// The board footprint includes row/col labels + a right spacer:
// - Width  ~= (SIZE + 2) * cell + (SIZE - 1) * gap + 2*border
// - Height ~= (SIZE + 1) * cell + (SIZE - 1) * gap + 2*border
const BOARD_GAP_PX = 1;      // .cyber-grid gap and label container gap
const BOARD_BORDER_PX = 2;   // .cyber-grid border width
let _layoutRaf = null;

function _cssVarPx(varName) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
}

function scheduleLayoutUpdate() {
    if (_layoutRaf !== null) return;
    _layoutRaf = requestAnimationFrame(() => {
        _layoutRaf = null;
        updateResponsiveBoardSizing();
    });
}

function updateResponsiveBoardSizing() {
    const wrapper = document.querySelector('.grid-wrapper');
    if (!wrapper) return;

    // Keep CSS grid-size in sync for any CSS that references it.
    document.documentElement.style.setProperty('--grid-size', String(SIZE));

    const safeLeft = _cssVarPx('--safe-area-left');
    const safeRight = _cssVarPx('--safe-area-right');
    const safeBottom = _cssVarPx('--safe-area-bottom');

    const viewportW = document.documentElement.clientWidth;
    const viewportH = window.innerHeight;

    const wrapperStyle = getComputedStyle(wrapper);
    const padX = (parseFloat(wrapperStyle.paddingLeft) || 0) + (parseFloat(wrapperStyle.paddingRight) || 0);
    const padY = (parseFloat(wrapperStyle.paddingTop) || 0) + (parseFloat(wrapperStyle.paddingBottom) || 0);

    const widthOverdraw = 1.05;
    const availableW = Math.max(0, (viewportW - safeLeft - safeRight) * widthOverdraw);
    // Use the wrapper's actual top position to account for safe areas, sticky
    // headers, and any dynamic bar heights.
    const wrapperTop = wrapper.getBoundingClientRect().top;
    const availableHBelowBars = Math.max(0, viewportH - wrapperTop - safeBottom);
    const maxWrapperTotalH = availableHBelowBars * 0.9;

    // Constrain the wrapper's *total* size (including padding/margins) to what fits.
    const maxWrapperContentW = Math.max(0, availableW - padX);
    const maxWrapperContentH = Math.max(0, maxWrapperTotalH - padY);

    // Board content size equations.
    const gapSpan = (SIZE - 1) * BOARD_GAP_PX;
    const borderSpan = 2 * BOARD_BORDER_PX;

    const maxCellByW = (maxWrapperContentW - gapSpan - borderSpan) / (SIZE + 2);
    const maxCellByH = (maxWrapperContentH - gapSpan - borderSpan) / (SIZE + 1);

    // Keep a sensible floor to avoid unusably tiny boards.
    const cell = Math.floor(Math.max(12, Math.min(maxCellByW, maxCellByH)));
    if (!Number.isFinite(cell) || cell <= 0) return;

    document.documentElement.style.setProperty('--cell-size', `${cell}px`);
}

// Tutorial mode state
let isTutorialMode = false;
let isUserInitiatedTutorial = false; // True if user started tutorial on current puzzle
let isTutorialHintsOnly = false; // If true, show hints but don't hide/lock tools or force tool selection
let tutorialHint = null; // Current hint being shown in tutorial
let hasCompletedTutorial = false; // Track if user has completed the tutorial
let lastTutorialTool = null; // Track the last required tool in tutorial mode
let wallSwitchCount = 0; // Count how many times we've switched to walls
let pathSwitchCount = 0; // Count how many times we've switched to paths
let hasSeenDataVaultIntro = false; // Track if user has seen data vault intro
let hasSeenAutoToolExplanation = false; // Track if user has seen Auto tool explanation
let hasSeenForkExplanation = false; // Track if user has seen Fork explanation
let hasSeenHintExplanation = false; // Track if user has seen Hint explanation

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

// Debug flag for hint validation - set to true to log details about invalid hints
// This is set to false during deploy by GitHub Actions
const DEBUG_HINTS = true;

// Assist mode settings - hierarchical toggle system
const assistSettings = {
    enabled: true,           // Master toggle
    visualHints: {
        enabled: true,       // All visual hints
        errorIndicators: true,    // Red X on invalid cells, red traces/dots for 2x2 clumps
        progressIndicators: true, // Green/blue/cyan completion indicators
        hintsEnabled: false       // Show hint buttons and allow hints - off by default
    },
    autoFill: {
        enabled: true,       // All auto-fill features
        deadEndFill: true,   // Auto-fill neighbors when clicking dead-ends
        wallCompletion: true,  // Auto-complete paths when walls are done (green headers)
        pathCompletion: false,  // Auto-complete walls when paths are done (blue headers) - off by default, very powerful
        applyHints: false    // Auto-apply hint cells when hint button is pressed - off by default
    }
};

// Helper functions to check assist settings
function isErrorIndicatorsEnabled() {
    return assistSettings.enabled && assistSettings.visualHints.enabled && assistSettings.visualHints.errorIndicators;
}
function isProgressIndicatorsEnabled() {
    return assistSettings.enabled && assistSettings.visualHints.enabled && assistSettings.visualHints.progressIndicators;
}
function isHintsEnabled() {
    return assistSettings.enabled && assistSettings.visualHints.enabled && assistSettings.visualHints.hintsEnabled;
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
function isApplyHintsEnabled() {
    return assistSettings.enabled && assistSettings.autoFill.enabled && assistSettings.autoFill.applyHints && isHintsEnabled();
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
    if (undoState === null || isWon || isTutorialMode) return;
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
    const undoBtn = document.getElementById('undoBtn');
    const addLayerBtn = document.getElementById('addLayerBtn');
    const newMazeBtn = document.getElementById('newMazeBtn');

    document.getElementById('commitBtn').disabled = currentIdx === 0;
    document.getElementById('discardBtn').disabled = currentIdx === 0;

    // Disable undo and fork during all tutorials
    if (isTutorialMode) {
        undoBtn.disabled = true;
        addLayerBtn.disabled = true;
    } else {
        undoBtn.disabled = undoState === null;
        addLayerBtn.disabled = currentIdx >= 3;
    }

    // Disable Initialize during first tutorial (not user-initiated)
    if (isTutorialMode && !isUserInitiatedTutorial) {
        newMazeBtn.disabled = true;
    } else {
        newMazeBtn.disabled = false;
    }

    // Use theme terminology for layer names
    const theme = typeof ThemeManager !== 'undefined' ? ThemeManager.current() : null;
    const layerNames = theme?.terminology?.layerNames || ['Root', 'Fork 1', 'Fork 2', 'Fork 3'];
    document.getElementById('layerName').innerText = layerNames[currentIdx] || `Layer ${currentIdx}`;
    document.getElementById('layerName').style.color = `var(--neon-${colors[currentIdx]})`;

    // Update button labels from theme
    if (theme?.terminology) {
        const t = theme.terminology;
        if (t.fork) addLayerBtn.textContent = t.fork;
        if (t.commit) document.getElementById('commitBtn').textContent = t.commit;
        if (t.discard) document.getElementById('discardBtn').textContent = t.discard;
        if (t.undo) undoBtn.textContent = t.undo;
        if (t.newGame) newMazeBtn.textContent = t.newGame;
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
// PERSISTENT PLAYER STATS (localStorage-based)
// ============================================
const PlayerStats = (() => {
    const STORAGE_KEY = 'neuralReconStats';

    const defaultStats = {
        totalWins: 0,
        totalTimePlayed: 0,  // milliseconds
        totalMoves: 0,
        bySize: {}           // { "4": {wins, bestStreak, fastestTime, fewestMoves}, ... }
    };

    function load() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                // Merge with defaults to handle new fields
                return { ...defaultStats, ...parsed };
            }
        } catch (e) {
            console.warn('Failed to load player stats:', e);
        }
        return { ...defaultStats };
    }

    function save(stats) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
        } catch (e) {
            console.warn('Failed to save player stats:', e);
        }
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
// LEVEL UNLOCK SYSTEM
// ============================================
const GRID_SIZES = [4, 5, 6, 7, 8];
const WINS_TO_UNLOCK_NEXT = 3; // Wins needed at a size to unlock next size

// Get the maximum unlocked grid size based on stats
function getMaxUnlockedSize() {
    const stats = PlayerStats.get();
    let maxUnlocked = 4; // 4x4 always unlocked

    for (let i = 0; i < GRID_SIZES.length - 1; i++) {
        const size = GRID_SIZES[i];
        const sizeStats = stats.bySize[String(size)];
        const wins = sizeStats ? sizeStats.wins : 0;

        if (wins >= WINS_TO_UNLOCK_NEXT) {
            maxUnlocked = GRID_SIZES[i + 1];
        } else {
            break; // Must unlock sizes in order
        }
    }

    return maxUnlocked;
}

// Check if a specific size is unlocked
function isSizeUnlocked(size) {
    return size <= getMaxUnlockedSize();
}

// Get the next size after the given size (or null if at max)
function getNextSize(size) {
    const idx = GRID_SIZES.indexOf(size);
    if (idx >= 0 && idx < GRID_SIZES.length - 1) {
        return GRID_SIZES[idx + 1];
    }
    return null;
}

// Check if completing a puzzle just unlocked a new size
function checkForNewUnlock(size) {
    const stats = PlayerStats.get();
    const sizeStats = stats.bySize[String(size)];
    const wins = sizeStats ? sizeStats.wins : 0;
    const nextSize = getNextSize(size);

    // Just hit exactly the unlock threshold
    if (wins === WINS_TO_UNLOCK_NEXT && nextSize !== null) {
        return nextSize;
    }
    return null;
}

// Update the grid size select to show locked/unlocked states
function updateGridSizeSelect() {
    const select = document.getElementById('gridSizeSelect');
    const maxUnlocked = getMaxUnlockedSize();

    Array.from(select.options).forEach(option => {
        const size = parseInt(option.value);
        if (size > maxUnlocked) {
            option.disabled = true;
            option.textContent = `${size}x${size} 🔒`;
        } else {
            option.disabled = false;
            option.textContent = `${size}x${size}`;
        }
    });

    // If current selection is locked, switch to max unlocked
    if (parseInt(select.value) > maxUnlocked) {
        select.value = String(maxUnlocked);
    }
}

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

    // Update responsive sizing before rendering the new grid.
    scheduleLayoutUpdate();

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

    // Show data vault intro if this is the first time seeing a stockpile
    if (stockpilePos && !hasSeenDataVaultIntro && !isTutorialMode) {
        // Small delay to let the grid render first
        setTimeout(() => {
            showDataVaultIntro();
        }, 500);
    }
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

    // Ensure sizing reflects restored size.
    scheduleLayoutUpdate();

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

    if (SIZE < DATA_VAULT_UNLOCK_SIZE) return; // No data vaults for sizes below unlock size

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

    // Sort by priority, then shuffle within each priority group using Fisher-Yates
    // (Using seededRandom in sort comparator is non-deterministic across platforms)
    candidates.sort((a, b) => a.priority - b.priority);

    // Fisher-Yates shuffle within priority groups
    let groupStart = 0;
    while (groupStart < candidates.length) {
        const currentPriority = candidates[groupStart].priority;
        let groupEnd = groupStart;
        while (groupEnd < candidates.length && candidates[groupEnd].priority === currentPriority) {
            groupEnd++;
        }
        // Shuffle from groupStart to groupEnd-1
        for (let i = groupEnd - 1; i > groupStart; i--) {
            const j = groupStart + Math.floor(seededRandom() * (i - groupStart + 1));
            [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
        }
        groupStart = groupEnd;
    }

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

    // Tutorial mode: in hint mode, allow completing hint cells
    // In other modes, only allow moves that match the current hint
    if (isTutorialMode && !isTutorialHintsOnly && drawingMode !== 'hint') {
        // Determine what value would be placed
        let intendedValue = 0;
        if (drawingMode === 'wall') {
            intendedValue = (mergedVal === 1 && layers[currentIdx][idx] === 1) ? 0 : 1;
        } else if (drawingMode === 'path') {
            intendedValue = (mergedVal === 2 && layers[currentIdx][idx] === 2) ? 0 : 2;
        } else if (drawingMode === 'erase') {
            intendedValue = 0;
        } else if (drawingMode === 'smart') {
            // Smart mode: empty->wall, wall->path, path->empty
            if (mergedVal === 0) intendedValue = 1;
            else if (mergedVal === 1) intendedValue = 2;
            else intendedValue = 0;
        }

        // Check if this move is valid in tutorial mode
        if (!isTutorialMoveValid(r, c, intendedValue)) {
            return; // Block the move
        }
    }

    // Handle hint mode - find and display hint for this cell
    if (drawingMode === 'hint') {
        // Check if this cell is currently pulsing from an active hint
        // If so, complete just this cell instead of showing a new hint
        const cellElement = document.getElementById('mainGrid').querySelectorAll('.cell')[idx];
        if (cellElement && cellElement.classList.contains('hint-highlight-cell') &&
            currentHint && currentHint.cells && currentHint.shouldBe) {
            // Check if this cell is one of the hint's cells
            const isHintCell = currentHint.cells.some(hc => hc.r === r && hc.c === c);
            if (isHintCell && mergedVal === 0 && !isDeadEnd && !isStockpile) {
                // Apply the hint to just this cell
                const fillValue = currentHint.shouldBe === 'wall' ? 1 : 2;
                const isLocked = layers.slice(0, currentIdx).some(l => l[idx] !== 0);
                if (!isLocked) {
                    saveUndoState();
                    if (currentIdx > 0 && forkAnchors[currentIdx] === null) {
                        forkAnchors[currentIdx] = {type: 'cell', idx: idx};
                    }
                    layers[currentIdx][idx] = fillValue;
                    if (fillValue === 1) {
                        ChipSound.wall();
                    } else {
                        ChipSound.path();
                    }
                    moveCount++;
                    update();
                    // Clear the hint highlights since we've acted on it
                    clearHintHighlights();
                    hideHintToast();
                    return;
                }
            }
        }

        // Only show hints for empty cells
        if (mergedVal !== 0 || isDeadEnd || isStockpile) {
            return;
        }

        const hint = getHintForCell(r, c);
        if (hint) {
            showHint(hint);
        } else {
            // No hint for this cell - show a message
            showHint({
                message: `No hint available for ${cellRef(r, c)} yet. Try another cell or use the ? button for the next available hint.`,
                highlight: { type: 'cell', r, c }
            });
        }
        return;
    }

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
    if(allWallsCorrect || isValidAlternateSolution(merged)) {
        isWon = true;
        triggerVictorySequence();
        return;
    }

    // Tutorial mode: check if current hint is complete and show next
    if (isTutorialMode) {
        onTutorialMove();
    }

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
            // Tutorial mode: show tutorial complete dialog instead of victory overlay
            if (isTutorialMode) {
                showTutorialComplete();
                return;
            }

            // Update stats
            winStreak++;
            const currentSessionTime = gameStartTime ? Date.now() - gameStartTime : 0;
            const elapsed = elapsedTimeBeforePause + currentSessionTime;
            document.getElementById('statTime').textContent = formatTime(elapsed);
            document.getElementById('statMoves').textContent = moveCount;
            document.getElementById('statStreak').textContent = winStreak;

            // Record persistent stats
            PlayerStats.recordWin(SIZE, elapsed, moveCount, winStreak);

            // Check if we just unlocked a new size
            const newlyUnlockedSize = checkForNewUnlock(SIZE);
            if (newlyUnlockedSize) {
                updateGridSizeSelect();
                showLevelUnlockedDialog(newlyUnlockedSize);
                return;
            }

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

// Show the level unlocked dialog
function showLevelUnlockedDialog(newSize) {
    const dialog = document.getElementById('levelUnlockedDialog');
    const sizeText = document.getElementById('unlockedSizeText');
    const technoText = document.getElementById('unlockTechnoText');
    const nextText = document.getElementById('unlockNextText');

    if (sizeText) {
        sizeText.textContent = `${newSize}×${newSize}`;
    }

    // Special message for data vault unlock size - introduces Data Vaults
    if (newSize === DATA_VAULT_UNLOCK_SIZE) {
        if (technoText) {
            technoText.textContent = 'Secure data sectors now within operational parameters. New containment protocols available.';
        }
        if (nextText) {
            nextText.innerHTML = `You've unlocked <span class="tutorial-highlight">${newSize}×${newSize}</span> grids. These larger matrices may contain <span class="tutorial-highlight">Data Vaults</span> — secure 3×3 zones with special rules. You can always return to smaller grids anytime.`;
        }
    } else {
        // Standard message for other sizes
        if (technoText) {
            technoText.textContent = 'Cognitive load capacity verified. Higher-complexity matrices now accessible.';
        }
        if (nextText) {
            nextText.innerHTML = `You've unlocked <span class="tutorial-highlight" id="unlockedSizeText">${newSize}×${newSize}</span> grids. Ready to increase the challenge? You can always return to smaller grids anytime.`;
        }
    }

    // Store the new size for the button handlers
    dialog.dataset.newSize = newSize;
    dialog.showModal();
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
    const selectedSize = parseInt(select.value);
    const previousSize = SIZE;

    // Check if selected size is unlocked
    if (!isSizeUnlocked(selectedSize)) {
        select.value = previousSize;
        ChipSound.error();
        return;
    }

    confirmReset(
        () => init(true),
        () => { select.value = previousSize; }
    );
};
document.getElementById('undoBtn').onclick = undo;
document.getElementById('addLayerBtn').onclick = () => {
    if (isTutorialMode) {
        ChipSound.error();
        return;
    }
    if(currentIdx < 3) {
        // Show Fork explanation on first use
        if (!hasSeenForkExplanation) {
            showForkExplanation();
        }
        
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
document.getElementById('newMazeBtn').onclick = () => {
    // Disable during first tutorial
    if (isTutorialMode && !isUserInitiatedTutorial) {
        ChipSound.error();
        return;
    }
    
    // If puzzle is won, behave like "Initialize Next Sequence" (no confirmation, keep streak)
    if (isWon) {
        init(false);
        return;
    }
    
    confirmReset(() => {
        // Starting a new puzzle should terminate any active tutorial (including hints-only).
        if (isTutorialMode) {
            // Close any tutorial dialogs that might be open, then clear tutorial state/UI locks.
            const tutorialDialogs = [
                document.getElementById('tutorialIntroDialog'),
                document.getElementById('tutorialCompleteDialog'),
                document.getElementById('userTutorialCompleteDialog'),
            ];
            tutorialDialogs.forEach(d => {
                if (d && d.open) d.close();
            });
            endTutorial();
        }
        init(true);
    });
};
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
// HINT SYSTEM HELPER FUNCTIONS

// Find empty cells in a row, optionally excluding cells adjacent to a given position
function findEmptyCellsInRow(merged, r, excludeAdjacentTo = null) {
    const emptyCells = [];
    for (let c = 0; c < SIZE; c++) {
        if (excludeAdjacentTo && Math.abs(c - excludeAdjacentTo.c) <= 1) continue;
        const idx = r * SIZE + c;
        if (merged[idx] === 0 && !isFixedPath(r, c)) {
            emptyCells.push({ r, c });
        }
    }
    return emptyCells;
}

// Find empty cells in a column, optionally excluding cells adjacent to a given position
function findEmptyCellsInCol(merged, c, excludeAdjacentTo = null) {
    const emptyCells = [];
    for (let r = 0; r < SIZE; r++) {
        if (excludeAdjacentTo && Math.abs(r - excludeAdjacentTo.r) <= 1) continue;
        const idx = r * SIZE + c;
        if (merged[idx] === 0 && !isFixedPath(r, c)) {
            emptyCells.push({ r, c });
        }
    }
    return emptyCells;
}

// Get perpendicular cells to a position (above/below for rows, left/right for columns)
// Returns array of {r, c, isEmpty} objects for cells that can be checked
function getPerpendicularCells(merged, r, c, direction) {
    const cells = [];
    if (direction === 'row') {
        // For rows, perpendicular means above and below
        if (r > 0) {
            const idx = (r - 1) * SIZE + c;
            cells.push({ r: r - 1, c, isEmpty: merged[idx] === 0 && !isFixedPath(r - 1, c) });
        }
        if (r < SIZE - 1) {
            const idx = (r + 1) * SIZE + c;
            cells.push({ r: r + 1, c, isEmpty: merged[idx] === 0 && !isFixedPath(r + 1, c) });
        }
    } else {
        // For columns, perpendicular means left and right
        if (c > 0) {
            const idx = r * SIZE + (c - 1);
            cells.push({ r, c: c - 1, isEmpty: merged[idx] === 0 && !isFixedPath(r, c - 1) });
        }
        if (c < SIZE - 1) {
            const idx = r * SIZE + (c + 1);
            cells.push({ r, c: c + 1, isEmpty: merged[idx] === 0 && !isFixedPath(r, c + 1) });
        }
    }
    return cells;
}

// Create a hint object with standardized structure and forCell filtering
function createHintObject(cells, shouldBe, message, highlight, forCell = null) {
    if (!cells || cells.length === 0) return null;
    
    // If forCell is specified, check if any cell matches
    if (forCell) {
        const matches = cells.some(cell => cell.r === forCell.r && cell.c === forCell.c);
        if (!matches) return null;
    }
    
    return {
        message,
        highlight,
        cells,
        shouldBe
    };
}

// Generic function to check a row or column for hints
// isRow: true for rows, false for columns
// index: row number or column number
// checkFn: callback(counts, emptyCells, isRow, index) that returns hint object or null
function checkRowColForHint(merged, isRow, index, checkFn, forCell = null) {
    const counts = isRow ? getRowCounts(merged, index) : getColCounts(merged, index);
    const emptyCells = isRow 
        ? findEmptyCellsInRow(merged, index)
        : findEmptyCellsInCol(merged, index);
    
    if (emptyCells.length === 0) return null;
    
    const hint = checkFn(counts, emptyCells, isRow, index);
    if (!hint) return null;
    
    // Apply forCell filtering if specified
    if (forCell) {
        const matches = emptyCells.some(ec => ec.r === forCell.r && ec.c === forCell.c);
        if (!matches) return null;
    }
    
    return hint;
}

// Count neighbors of a cell (walls, paths, empty cells)
// Returns { wallCount, pathCount, emptyCount, emptyCells, wallCells, pathCells }
// emptyCells, wallCells, pathCells are arrays of {r, c} objects
function countNeighbors(merged, r, c, treatEdgesAsWalls = true) {
    let wallCount = 0;
    let pathCount = 0;
    let emptyCount = 0;
    const emptyCells = [];
    const wallCells = [];
    const pathCells = [];

    for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) {
            if (treatEdgesAsWalls) {
                wallCount++;
            }
            continue;
        }
        const nIdx = nr * SIZE + nc;
        if (merged[nIdx] === 1) {
            wallCount++;
            wallCells.push({ r: nr, c: nc });
        } else if (merged[nIdx] === 2 || isFixedPath(nr, nc)) {
            pathCount++;
            pathCells.push({ r: nr, c: nc });
        } else {
            emptyCount++;
            emptyCells.push({ r: nr, c: nc });
        }
    }

    return { wallCount, pathCount, emptyCount, emptyCells, wallCells, pathCells };
}

// Generic function to iterate all cells and collect hints with forCell support
// checkFn: callback(merged, r, c) that returns hint object or null
// Returns the first hint that matches forCell, or the best candidate if no forCell
function iterateAllCellsForHint(merged, checkFn, forCell = null, bestSelector = null) {
    const candidates = [];
    
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            const hint = checkFn(merged, r, c);
            if (!hint) continue;
            
            // If forCell is specified, check if hint includes that cell
            if (forCell && hint.cells) {
                const matches = hint.cells.some(cell => cell.r === forCell.r && cell.c === forCell.c);
                if (matches) return hint;
            }
            
            candidates.push(hint);
        }
    }
    
    if (forCell) return null;
    if (candidates.length === 0) return null;
    
    // Use bestSelector if provided, otherwise return first
    if (bestSelector) {
        return candidates.reduce(bestSelector);
    }
    return candidates[0];
}

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

// Hint: Trivial rows/columns (0 or SIZE walls) should be filled first
// These are the easiest deductions and should be suggested early
function hintTrivialRowCol(merged, forCell = null) {
    const candidates = [];

    // Check function for trivial cases
    function checkTrivial(counts, emptyCells, isRow, index) {
        const { walls, paths, target } = counts;
        if (emptyCells.length === 0) return null;

        // Only handle trivial cases: target is 0 or SIZE
        if (target === 0 && walls === 0) {
            const lineName = isRow ? `Row ${rowToNumber(index)}` : `Column ${colToLetter(index)}`;
            return {
                message: `${lineName} needs 0 walls, so all cells must be paths.`,
                highlight: isRow ? { type: 'row', index } : { type: 'col', index },
                cells: emptyCells, shouldBe: 'path'
            };
        } else if (target === SIZE && paths === 0) {
            const lineName = isRow ? `Row ${rowToNumber(index)}` : `Column ${colToLetter(index)}`;
            return {
                message: `${lineName} needs ${SIZE} walls, so all cells must be walls.`,
                highlight: isRow ? { type: 'row', index } : { type: 'col', index },
                cells: emptyCells, shouldBe: 'wall'
            };
        }
        return null;
        }

    // Check rows
    for (let r = 0; r < SIZE; r++) {
        const hint = checkRowColForHint(merged, true, r, (counts, emptyCells) => 
            checkTrivial(counts, emptyCells, true, r), forCell);
        if (hint) {
            if (forCell) return hint;
            candidates.push(hint);
        }
    }

    // Check columns
    for (let c = 0; c < SIZE; c++) {
        const hint = checkRowColForHint(merged, false, c, (counts, emptyCells) => 
            checkTrivial(counts, emptyCells, false, c), forCell);
        if (hint) {
            if (forCell) return hint;
            candidates.push(hint);
        }
    }

    if (forCell) return null;
    if (candidates.length === 0) return null;
    return candidates.reduce((best, curr) => curr.cells.length > best.cells.length ? curr : best);
}

// Hint 2: Row or column can be finished (walls or paths complete)
function hintRowColComplete(merged, forCell = null) {
    // Collect all possible hints and return the one with the most cells
    const candidates = [];

    // Check function for completion cases
    function checkComplete(counts, emptyCells, isRow, index) {
        const { walls, paths, target, expectedPaths } = counts;
        if (emptyCells.length === 0) return null;

        const lineName = isRow ? `Row ${rowToNumber(index)}` : `Column ${colToLetter(index)}`;
        let hint = null;

        if (walls === target) {
            const pathMessage = emptyCells.length === 1 ? 'The remaining cell must be a path' : 'The remaining cells must all be paths';
            hint = {
                message: `${lineName} has all its walls. ${pathMessage}.`,
                highlight: isRow ? { type: 'row', index } : { type: 'col', index },
                cells: emptyCells, shouldBe: 'path'
            };
        } else if (paths === expectedPaths) {
            const wallMessage = emptyCells.length === 1 ? 'The remaining cell must be a wall' : 'The remaining cells must all be walls';
            hint = {
                message: `${lineName} has all its paths. ${wallMessage}.`,
                highlight: isRow ? { type: 'row', index } : { type: 'col', index },
                cells: emptyCells, shouldBe: 'wall'
            };
        }

                return hint;
            }

    // Check rows
    for (let r = 0; r < SIZE; r++) {
        const hint = checkRowColForHint(merged, true, r, (counts, emptyCells) => 
            checkComplete(counts, emptyCells, true, r), forCell);
        if (hint) {
            if (forCell) return hint;
            candidates.push(hint);
        }
    }

    // Check columns
    for (let c = 0; c < SIZE; c++) {
        const hint = checkRowColForHint(merged, false, c, (counts, emptyCells) => 
            checkComplete(counts, emptyCells, false, c), forCell);
        if (hint) {
            if (forCell) return hint;
            candidates.push(hint);
        }
    }

    // Return the hint with the most cells
    if (forCell) return null;
    if (candidates.length === 0) return null;
    return candidates.reduce((best, curr) => curr.cells.length > best.cells.length ? curr : best);
}

// Hint 3: Dead end can be finished (has 1 path or 3 walls around it)
function hintDeadEndCanBeFinished(merged, forCell = null) {
    function checkDeadEnd(merged, r, c) {
        if (!isTargetDeadEnd(r, c)) return null;

        const { pathCount, wallCount, emptyCount, emptyCells } = countNeighbors(merged, r, c);

            // Dead end has exactly 1 path - remaining empty neighbors must be walls
            if (pathCount === 1 && emptyCount > 0) {
                const cellList = formatCellList(emptyCells);
                const cellWord = emptyCount === 1 ? 'Cell' : 'Cells';
                const wallWord = emptyCount === 1 ? 'a wall' : 'walls';
                const mustWord = emptyCount === 1 ? 'must' : emptyCount == 2 ? 'must both' : 'must all';
            return {
                    message: `${cellWord} ${cellList} ${mustWord} be ${wallWord} to complete the dead end at ${cellRef(r, c)}.`,
                    highlight: emptyCount === 1
                        ? { type: 'cell', r: emptyCells[0].r, c: emptyCells[0].c }
                        : { type: 'cells', cells: emptyCells },
                    cells: emptyCells, shouldBe: 'wall'
                };
            }

            // Dead end has 3 walls - the remaining empty neighbor must be a path
            if (wallCount === 3 && emptyCount === 1 && pathCount === 0) {
                const cell = emptyCells[0];
            return {
                    message: `Cell ${cellRef(cell.r, cell.c)} must be a path to complete the dead end at ${cellRef(r, c)}.`,
                    highlight: { type: 'cell', r: cell.r, c: cell.c },
                    cells: [cell], shouldBe: 'path'
                };
            }

        return null;
    }

    return iterateAllCellsForHint(merged, checkDeadEnd, forCell, 
        (best, curr) => curr.cells.length > best.cells.length ? curr : best);
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
            highlight: { type: 'cell', r: cell.r, c: cell.c },
            cells: guaranteedPaths, shouldBe: 'path'
        };
    } else {
        const cellList = formatCellList(guaranteedPaths);
        return {
            message: `Cells ${cellList} must be paths. Any valid vault containing the data cache must include these cells.`,
            highlight: { type: 'cells', cells: guaranteedPaths },
            cells: guaranteedPaths, shouldBe: 'path'
        };
    }
}

// Hint: If only one vault position is valid and some interior cells are empty, they must be paths
// This handles cases where paths around the stockpile constrain the vault to a single position
function hintVaultInteriorMustBePath(merged) {
    if (!stockpilePos) return null;

    const cacheR = stockpilePos.r;
    const cacheC = stockpilePos.c;

    // Check if a 3x3 vault position is valid (no walls inside, at most 1 door, row/col constraints satisfied)
    function isValidVaultPosition(vr, vc) {
        // Must be within grid
        if (vr < 0 || vr + 2 >= SIZE || vc < 0 || vc + 2 >= SIZE) return false;

        // Must contain the stockpile
        if (cacheR < vr || cacheR > vr + 2 || cacheC < vc || cacheC > vc + 2) return false;

        // Check no walls inside the 3x3
        for (let dr = 0; dr < 3; dr++) {
            for (let dc = 0; dc < 3; dc++) {
                const idx = (vr + dr) * SIZE + (vc + dc);
                if (merged[idx] === 1) return false;
            }
        }

        // Count paths on the perimeter (doors) - vault can only have 1 door
        let doorCount = 0;
        const checkPerimeter = (pr, pc) => {
            if (pr < 0 || pr >= SIZE || pc < 0 || pc >= SIZE) return;
            const pIdx = pr * SIZE + pc;
            if (merged[pIdx] === 2 || isFixedPath(pr, pc)) doorCount++;
        };
        // Top perimeter
        if (vr > 0) for (let dc = 0; dc < 3; dc++) checkPerimeter(vr - 1, vc + dc);
        // Bottom perimeter
        if (vr + 3 < SIZE) for (let dc = 0; dc < 3; dc++) checkPerimeter(vr + 3, vc + dc);
        // Left perimeter
        if (vc > 0) for (let dr = 0; dr < 3; dr++) checkPerimeter(vr + dr, vc - 1);
        // Right perimeter
        if (vc + 3 < SIZE) for (let dr = 0; dr < 3; dr++) checkPerimeter(vr + dr, vc + 3);

        if (doorCount > 1) return false; // Too many doors

        // Check row constraints
        for (let dr = 0; dr < 3; dr++) {
            const r = vr + dr;
            const { target: rowTarget } = getRowCounts(merged, r);
            let wallsOutside = 0, emptyOutside = 0;
            for (let c = 0; c < SIZE; c++) {
                if (c >= vc && c <= vc + 2) continue;
                const idx = r * SIZE + c;
                if (merged[idx] === 1) wallsOutside++;
                else if (merged[idx] === 0 && !isFixedPath(r, c)) emptyOutside++;
            }
            if (rowTarget > wallsOutside + emptyOutside) return false;
        }

        // Check column constraints
        for (let dc = 0; dc < 3; dc++) {
            const c = vc + dc;
            const { target: colTarget } = getColCounts(merged, c);
            let wallsOutside = 0, emptyOutside = 0;
            for (let r = 0; r < SIZE; r++) {
                if (r >= vr && r <= vr + 2) continue;
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

    if (validVaults.length !== 1) return null; // Only applies when exactly one vault position is valid

    const vault = validVaults[0];

    // Find empty cells inside this vault that must be paths
    const emptyInterior = [];
    for (let dr = 0; dr < 3; dr++) {
        for (let dc = 0; dc < 3; dc++) {
            const r = vault.r + dr, c = vault.c + dc;
            const idx = r * SIZE + c;
            if (merged[idx] === 0 && !isFixedPath(r, c)) {
                emptyInterior.push({ r, c });
            }
        }
    }

    if (emptyInterior.length === 0) return null;

    if (emptyInterior.length === 1) {
        const cell = emptyInterior[0];
        return {
            message: `Cell ${cellRef(cell.r, cell.c)} must be paths within the vault. This is the only valid vault position, so all interior cells must be paths.`,
            highlight: { type: 'cell', r: cell.r, c: cell.c },
            cells: emptyInterior, shouldBe: 'path'
        };
    } else {
        const cellList = formatCellList(emptyInterior);
        return {
            message: `Cells ${cellList} must be paths within the vault. This is the only valid vault position, so all interior cells must be paths.`,
            highlight: { type: 'cells', cells: emptyInterior },
            cells: emptyInterior, shouldBe: 'path'
        };
    }
}

// Hint: If vault interior is complete (3x3 paths with single exit), remaining perimeter must be walls
function hintVaultPerimeterComplete(merged) {
    if (!stockpilePos) return null;

    // Check all possible 3x3 vault positions containing the stockpile
    for (let roomR = Math.max(0, stockpilePos.r - 2); roomR <= Math.min(stockpilePos.r, SIZE - 3); roomR++) {
        for (let roomC = Math.max(0, stockpilePos.c - 2); roomC <= Math.min(stockpilePos.c, SIZE - 3); roomC++) {
            // Check if stockpile is in this room
            if (stockpilePos.r < roomR || stockpilePos.r > roomR + 2 ||
                stockpilePos.c < roomC || stockpilePos.c > roomC + 2) continue;

            // Check if all 9 interior cells are paths
            let interiorComplete = true;
            for (let dr = 0; dr < 3 && interiorComplete; dr++) {
                for (let dc = 0; dc < 3 && interiorComplete; dc++) {
                    const cr = roomR + dr, cc = roomC + dc;
                    const idx = cr * SIZE + cc;
                    const isStockpileCell = stockpilePos.r === cr && stockpilePos.c === cc;
                    if (merged[idx] !== 2 && !isTargetDeadEnd(cr, cc) && !isStockpileCell) {
                        interiorComplete = false;
                    }
                }
            }
            if (!interiorComplete) continue;

            // Interior is complete - count doors (paths in perimeter) and find empty perimeter cells
            let doorCount = 0;
            const emptyPerimeter = [];

            // Helper to check a perimeter cell
            const checkPerimeter = (pr, pc) => {
                if (pr < 0 || pr >= SIZE || pc < 0 || pc >= SIZE) return; // Edge of grid
                const pIdx = pr * SIZE + pc;
                if (merged[pIdx] === 2 || isFixedPath(pr, pc)) {
                    doorCount++;
                } else if (merged[pIdx] === 0 && !isFixedPath(pr, pc)) {
                    emptyPerimeter.push({ r: pr, c: pc });
                }
            };

            // Top perimeter (row above room)
            if (roomR > 0) {
                for (let dc = 0; dc < 3; dc++) checkPerimeter(roomR - 1, roomC + dc);
            }
            // Bottom perimeter (row below room)
            if (roomR + 3 < SIZE) {
                for (let dc = 0; dc < 3; dc++) checkPerimeter(roomR + 3, roomC + dc);
            }
            // Left perimeter (column left of room)
            if (roomC > 0) {
                for (let dr = 0; dr < 3; dr++) checkPerimeter(roomR + dr, roomC - 1);
            }
            // Right perimeter (column right of room)
            if (roomC + 3 < SIZE) {
                for (let dr = 0; dr < 3; dr++) checkPerimeter(roomR + dr, roomC + 3);
            }

            // If exactly 1 door and there are empty perimeter cells, they must be walls
            if (doorCount === 1 && emptyPerimeter.length > 0) {
                if (emptyPerimeter.length === 1) {
                    const cell = emptyPerimeter[0];
                    return {
                        message: `Cell ${cellRef(cell.r, cell.c)} must be a wall. The vault interior is complete with one door, so the remaining perimeter must be sealed.`,
                        highlight: { type: 'cell', r: cell.r, c: cell.c },
                        cells: emptyPerimeter, shouldBe: 'wall'
                    };
                } else {
                    const cellList = formatCellList(emptyPerimeter);
                    return {
                        message: `Cells ${cellList} must be walls. The vault interior is complete with one door, so the remaining perimeter must be sealed.`,
                        highlight: { type: 'cells', cells: emptyPerimeter },
                        cells: emptyPerimeter, shouldBe: 'wall'
                    };
                }
            }
        }
    }
    return null;
}

// Hint: Vault exit cannot be adjacent to dead end in certain positions
// A vault exit on the center of an edge cannot be adjacent to a dead end
// A vault exit on a corner adjacent to a dead end cannot be on the grid edge
function hintVaultExitDeadEnd(merged) {
    if (!stockpilePos) return null;

    const cacheR = stockpilePos.r;
    const cacheC = stockpilePos.c;

    // Find the vault position where all 9 interior cells are paths
    // Check all possible 3x3 vault positions containing the stockpile
    for (let vr = Math.max(0, cacheR - 2); vr <= Math.min(cacheR, SIZE - 3); vr++) {
        for (let vc = Math.max(0, cacheC - 2); vc <= Math.min(cacheC, SIZE - 3); vc++) {
            // Check if stockpile is in this vault
            if (cacheR < vr || cacheR > vr + 2 || cacheC < vc || cacheC > vc + 2) continue;

            // Check if all 9 interior cells are paths (vault is complete)
            let vaultComplete = true;
            for (let dr = 0; dr < 3 && vaultComplete; dr++) {
                for (let dc = 0; dc < 3 && vaultComplete; dc++) {
                    const cr = vr + dr, cc = vc + dc;
                    const idx = cr * SIZE + cc;
                    const isStockpileCell = cacheR === cr && cacheC === cc;
                    // All cells must be paths (or stockpile/dead end which are fixed paths)
                    if (merged[idx] !== 2 && !isTargetDeadEnd(cr, cc) && !isStockpileCell) {
                        vaultComplete = false;
                    }
                }
            }
            if (!vaultComplete) continue;

            // Check perimeter cells for potential exits (the 12 cells surrounding the vault)
            const checkPerimeterExit = (pr, pc, isCorner, isEdgeCenter) => {
                if (pr < 0 || pr >= SIZE || pc < 0 || pc >= SIZE) return null;
                const pIdx = pr * SIZE + pc;
                
                // Only check empty cells (potential exits)
                if (merged[pIdx] !== 0) return null;

                // Verify this cell is directly adjacent to the vault (one of its 4 neighbors is in the vault)
                let adjacentToVault = false;
                for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
                    const nr = pr + dr, nc = pc + dc;
                    if (nr >= vr && nr <= vr + 2 && nc >= vc && nc <= vc + 2) {
                        // This neighbor is inside the vault - since vault is complete, it's a path
                        adjacentToVault = true;
                        break;
                    }
                }
                if (!adjacentToVault) return null;

                // Check if this perimeter cell is adjacent to a dead end
                let adjacentToDeadEnd = false;
                for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
                    const nr = pr + dr, nc = pc + dc;
                    if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && isTargetDeadEnd(nr, nc)) {
                        adjacentToDeadEnd = true;
                        break;
                    }
                }

                if (!adjacentToDeadEnd) return null;

                // Case 1: Center of edge adjacent to dead end - cannot be exit
                if (isEdgeCenter) {
                    return {
                        message: `Cell ${cellRef(pr, pc)} cannot be the vault exit. It's next to a dead end that would cut off the vault from the rest of the grid.`,
                        highlight: { type: 'cell', r: pr, c: pc },
                        cells: [{ r: pr, c: pc }], shouldBe: 'wall'
                    };
                }

                // Case 2: Corner adjacent to dead end on grid edge - cannot be exit
                if (isCorner && (pr === 0 || pr === SIZE - 1 || pc === 0 || pc === SIZE - 1)) {
                    return {
                        message: `Cell ${cellRef(pr, pc)} cannot be the vault exit. It's next to a dead end that would cut off the vault from the rest of the grid.`,
                        highlight: { type: 'cell', r: pr, c: pc },
                        cells: [{ r: pr, c: pc }], shouldBe: 'wall'
                    };
                }

                return null;
            };

            // Check top perimeter (row above vault)
            if (vr > 0) {
                // Left corner
                const topLeftHint = checkPerimeterExit(vr - 1, vc, true, false);
                if (topLeftHint) return topLeftHint;
                // Center
                const topCenterHint = checkPerimeterExit(vr - 1, vc + 1, false, true);
                if (topCenterHint) return topCenterHint;
                // Right corner
                const topRightHint = checkPerimeterExit(vr - 1, vc + 2, true, false);
                if (topRightHint) return topRightHint;
            }

            // Check bottom perimeter (row below vault)
            if (vr + 3 < SIZE) {
                // Left corner
                const bottomLeftHint = checkPerimeterExit(vr + 3, vc, true, false);
                if (bottomLeftHint) return bottomLeftHint;
                // Center
                const bottomCenterHint = checkPerimeterExit(vr + 3, vc + 1, false, true);
                if (bottomCenterHint) return bottomCenterHint;
                // Right corner
                const bottomRightHint = checkPerimeterExit(vr + 3, vc + 2, true, false);
                if (bottomRightHint) return bottomRightHint;
            }

            // Check left perimeter (column left of vault)
            if (vc > 0) {
                // Top corner
                const leftTopHint = checkPerimeterExit(vr, vc - 1, true, false);
                if (leftTopHint) return leftTopHint;
                // Center
                const leftCenterHint = checkPerimeterExit(vr + 1, vc - 1, false, true);
                if (leftCenterHint) return leftCenterHint;
                // Bottom corner
                const leftBottomHint = checkPerimeterExit(vr + 2, vc - 1, true, false);
                if (leftBottomHint) return leftBottomHint;
            }

            // Check right perimeter (column right of vault)
            if (vc + 3 < SIZE) {
                // Top corner
                const rightTopHint = checkPerimeterExit(vr, vc + 3, true, false);
                if (rightTopHint) return rightTopHint;
                // Center
                const rightCenterHint = checkPerimeterExit(vr + 1, vc + 3, false, true);
                if (rightCenterHint) return rightCenterHint;
                // Bottom corner
                const rightBottomHint = checkPerimeterExit(vr + 2, vc + 3, true, false);
                if (rightBottomHint) return rightBottomHint;
            }
        }
    }

    return null;
}

// Hint: When only 4 empty cells remain and puzzle has two valid solutions, suggest one
function hintTwoValidSolutions(merged, forCell = null) {
    // Find all empty cells
    const emptyCells = [];
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            const idx = r * SIZE + c;
            if (merged[idx] === 0 && !isFixedPath(r, c)) {
                emptyCells.push({ r, c });
            }
        }
    }

    // Only apply if exactly 4 empty cells
    if (emptyCells.length !== 4) return null;

    // If forCell is specified, check if it's one of the 4 empty cells
    if (forCell) {
        const isInEmptyCells = emptyCells.some(ec => ec.r === forCell.r && ec.c === forCell.c);
        if (!isInEmptyCells) return null;
    }

    // Try all possible pairings: (0,1) & (2,3), (0,2) & (1,3), (0,3) & (1,2)
    const pairings = [
        [[0, 1], [2, 3]],
        [[0, 2], [1, 3]],
        [[0, 3], [1, 2]]
    ];

    const validSolutions = [];

    for (const pairing of pairings) {
        const [pair1, pair2] = pairing;
        
        // Try making pair1 walls and pair2 paths
        const testBoard1 = [...merged];
        for (const idx of pair1) {
            testBoard1[emptyCells[idx].r * SIZE + emptyCells[idx].c] = 1; // wall
        }
        for (const idx of pair2) {
            testBoard1[emptyCells[idx].r * SIZE + emptyCells[idx].c] = 2; // path
        }
        if (isValidAlternateSolution(testBoard1)) {
            validSolutions.push({
                walls: pair1.map(idx => emptyCells[idx]),
                paths: pair2.map(idx => emptyCells[idx])
            });
        }

        // Try making pair1 paths and pair2 walls
        const testBoard2 = [...merged];
        for (const idx of pair1) {
            testBoard2[emptyCells[idx].r * SIZE + emptyCells[idx].c] = 2; // path
        }
        for (const idx of pair2) {
            testBoard2[emptyCells[idx].r * SIZE + emptyCells[idx].c] = 1; // wall
        }
        if (isValidAlternateSolution(testBoard2)) {
            validSolutions.push({
                walls: pair2.map(idx => emptyCells[idx]),
                paths: pair1.map(idx => emptyCells[idx])
            });
        }
    }

    // Only hint if exactly 2 solutions found
    if (validSolutions.length !== 2) return null;

    // Check which solution matches the canonical solution
    let matchingSolution = null;
    for (const sol of validSolutions) {
        let matches = true;
        for (const cell of sol.walls) {
            if (solution[cell.r][cell.c] !== 1) {
                matches = false;
                break;
            }
        }
        if (matches) {
            // Also verify the paths match
            for (const cell of sol.paths) {
                if (solution[cell.r][cell.c] !== 0) {
                    matches = false;
                    break;
                }
            }
            if (matches) {
                matchingSolution = sol;
                break;
            }
        }
    }

    // If no solution matches exactly, pick the first one (both are valid)
    const solutionToSuggest = matchingSolution || validSolutions[0];
    const cellList = formatCellList(solutionToSuggest.walls);
    const cellWord = solutionToSuggest.walls.length === 1 ? 'Cell' : 'Cells';

    return {
        message: `Two solutions are valid. Try making ${cellWord} ${cellList} ${solutionToSuggest.walls.length === 1 ? 'a wall' : 'walls'}.`,
        highlight: solutionToSuggest.walls.length === 1
            ? { type: 'cell', r: solutionToSuggest.walls[0].r, c: solutionToSuggest.walls[0].c }
            : { type: 'cells', cells: solutionToSuggest.walls },
        // Include all 4 empty cells so clicking any of them will show the hint
        // But only the suggested cells (in highlight) should be validated
        cells: emptyCells,
        shouldBe: 'wall',
        // Mark that validation should only check highlighted cells, not all cells
        validateOnlyHighlighted: true
    };
}

// Hint: If placing a wall/path would complete a row/column and cause an obvious error, cell must be opposite
// Errors checked: 2x2 path block (outside vault), invalid dead end, dead end with multiple exits, disconnected paths
function hintRowColCompletionCausesError(merged) {
    // Helper to check if a 2x2 at (topR, topC) would be all paths in the test board
    const would2x2BeAllPaths = (testBoard, topR, topC) => {
        if (topR < 0 || topR + 1 >= SIZE || topC < 0 || topC + 1 >= SIZE) return false;
        for (const [dr, dc] of [[0, 0], [0, 1], [1, 0], [1, 1]]) {
            const cr = topR + dr, cc = topC + dc;
            const idx = cr * SIZE + cc;
            if (testBoard[idx] !== 2 && !isFixedPath(cr, cc)) return false;
        }
        // Check if near stockpile (2x2 paths allowed there)
        if (stockpilePos) {
            for (const [dr, dc] of [[0, 0], [0, 1], [1, 0], [1, 1]]) {
                const cr = topR + dr, cc = topC + dc;
                if (Math.abs(cr - stockpilePos.r) <= 1 && Math.abs(cc - stockpilePos.c) <= 1) {
                    return false; // Near stockpile, 2x2 allowed
                }
            }
        }
        return true;
    };

    // Helper to check if cell would be an invalid dead end in test board
    const wouldBeInvalidDeadEnd = (testBoard, r, c) => {
        const idx = r * SIZE + c;
        if (testBoard[idx] !== 2 && !isFixedPath(r, c)) return false;
        if (isTargetDeadEnd(r, c)) return false;
        let wallCount = 0;
        for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
            const nr = r + dr, nc = c + dc;
            if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) wallCount++;
            else if (testBoard[nr * SIZE + nc] === 1) wallCount++;
        }
        return wallCount >= 3;
    };

    // Helper to check if a dead end would have multiple paths
    const wouldDeadEndHaveMultiplePaths = (testBoard, r, c) => {
        if (!isTargetDeadEnd(r, c)) return false;
        let pathCount = 0;
        for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
            const nr = r + dr, nc = c + dc;
            if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) continue;
            const nIdx = nr * SIZE + nc;
            if (testBoard[nIdx] === 2 || isFixedPath(nr, nc)) pathCount++;
        }
        return pathCount > 1;
    };

    // Helper to check if paths would be truly disconnected (separated by walls with no possible route)
    // Paths are only "disconnected" if walls make it impossible to connect them - empty cells don't count
    const wouldPathsBeDisconnected = (testBoard) => {
        const pathCells = [];
        for (let i = 0; i < SIZE * SIZE; i++) {
            const r = Math.floor(i / SIZE), c = i % SIZE;
            if (testBoard[i] === 2 || isFixedPath(r, c)) pathCells.push(i);
        }
        if (pathCells.length <= 1) return false;

        // BFS from first path cell, traversing through paths AND empty cells (not walls)
        // This checks if all path cells are in the same "reachable region"
        const visited = new Set();
        const stack = [pathCells[0]];
        visited.add(pathCells[0]);

        while (stack.length > 0) {
            const idx = stack.pop();
            const r = Math.floor(idx / SIZE), c = idx % SIZE;
            for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
                const nr = r + dr, nc = c + dc;
                if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) {
                    const nIdx = nr * SIZE + nc;
                    // Can traverse through non-wall cells (paths or empty)
                    if (!visited.has(nIdx) && testBoard[nIdx] !== 1) {
                        visited.add(nIdx);
                        stack.push(nIdx);
                    }
                }
            }
        }

        // Check if all path cells were reached
        for (const pathIdx of pathCells) {
            if (!visited.has(pathIdx)) return true; // This path cell is unreachable - truly disconnected
        }
        return false;
    };

    // Check what errors would occur after filling a row/column
    const checkForErrors = (testBoard, filledCells, fillType) => {
        // Check each filled cell and its neighbors for errors
        for (const cell of filledCells) {
            const { r, c } = cell;

            if (fillType === 2) { // Filled with paths
                // Check for 2x2 path blocks involving this cell
                for (const [dr, dc] of [[0, 0], [0, -1], [-1, 0], [-1, -1]]) {
                    if (would2x2BeAllPaths(testBoard, r + dr, c + dc)) {
                        return { type: '2x2', r, c };
                    }
                }
                // Check if this cell becomes an invalid dead end
                if (wouldBeInvalidDeadEnd(testBoard, r, c)) {
                    return { type: 'invalid-dead-end', r, c };
                }
            }

            if (fillType === 1) { // Filled with walls
                // Check neighbors for invalid dead ends
                for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
                    const nr = r + dr, nc = c + dc;
                    if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) {
                        if (wouldBeInvalidDeadEnd(testBoard, nr, nc)) {
                            return { type: 'invalid-dead-end', r: nr, c: nc };
                        }
                    }
                }
            }

            // Check adjacent dead ends for multiple paths
            for (const [dr, dc] of [[0, 0], [0, 1], [0, -1], [1, 0], [-1, 0]]) {
                const nr = r + dr, nc = c + dc;
                if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) {
                    if (wouldDeadEndHaveMultiplePaths(testBoard, nr, nc)) {
                        return { type: 'dead-end-multiple', r: nr, c: nc };
                    }
                }
            }
        }

        // Check for disconnected paths (only if we added walls)
        if (fillType === 1 && wouldPathsBeDisconnected(testBoard)) {
            return { type: 'disconnected' };
        }

        return null;
    };

    // Try each empty cell
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            const idx = r * SIZE + c;
            if (merged[idx] !== 0 || isFixedPath(r, c)) continue;

            // Check if locked by lower layer
            const isLocked = layers.slice(0, currentIdx).some(l => l[idx] !== 0);
            if (isLocked) continue;

            // Try placing a wall here
            for (const tryType of [1, 2]) { // 1 = wall, 2 = path
                const testBoard = [...merged];
                testBoard[idx] = tryType;

                // Check row completion
                const rowCounts = getRowCounts(testBoard, r);
                let rowWouldComplete = false;
                let rowFillType = 0;
                let rowEmptyCells = [];

                if (rowCounts.walls === rowCounts.target) {
                    // Row walls complete - remaining empty cells become paths
                    rowWouldComplete = true;
                    rowFillType = 2;
                    for (let cc = 0; cc < SIZE; cc++) {
                        if (testBoard[r * SIZE + cc] === 0 && !isFixedPath(r, cc)) {
                            rowEmptyCells.push({ r, c: cc });
                        }
                    }
                } else if (rowCounts.paths === rowCounts.expectedPaths) {
                    // Row paths complete - remaining empty cells become walls
                    rowWouldComplete = true;
                    rowFillType = 1;
                    for (let cc = 0; cc < SIZE; cc++) {
                        if (testBoard[r * SIZE + cc] === 0 && !isFixedPath(r, cc)) {
                            rowEmptyCells.push({ r, c: cc });
                        }
                    }
                }

                if (rowWouldComplete && rowEmptyCells.length > 0) {
                    // Simulate filling the row
                    const rowTestBoard = [...testBoard];
                    for (const cell of rowEmptyCells) {
                        rowTestBoard[cell.r * SIZE + cell.c] = rowFillType;
                    }
                    const error = checkForErrors(rowTestBoard, rowEmptyCells, rowFillType);
                    if (error) {
                        const opposite = tryType === 1 ? 'path' : 'wall';
                        const placed = tryType === 1 ? 'wall' : 'path';
                        let reason = '';
                        if (error.type === '2x2') reason = 'it would create a 2×2 path block';
                        else if (error.type === 'invalid-dead-end') reason = `it would trap ${cellRef(error.r, error.c)} as a dead end`;
                        else if (error.type === 'dead-end-multiple') reason = `it would give the dead end at ${cellRef(error.r, error.c)} multiple exits`;
                        else if (error.type === 'disconnected') reason = 'it would disconnect the path network';

                        return {
                            message: `Cell ${cellRef(r, c)} must be a ${opposite}. Placing a ${placed} would complete row ${rowToNumber(r)}, but ${reason}.`,
                            highlight: { type: 'cell', r, c },
                            cells: [{ r, c }], shouldBe: opposite
                        };
                    }
                }

                // Check column completion
                const colCounts = getColCounts(testBoard, c);
                let colWouldComplete = false;
                let colFillType = 0;
                let colEmptyCells = [];

                if (colCounts.walls === colCounts.target) {
                    colWouldComplete = true;
                    colFillType = 2;
                    for (let rr = 0; rr < SIZE; rr++) {
                        if (testBoard[rr * SIZE + c] === 0 && !isFixedPath(rr, c)) {
                            colEmptyCells.push({ r: rr, c });
                        }
                    }
                } else if (colCounts.paths === colCounts.expectedPaths) {
                    colWouldComplete = true;
                    colFillType = 1;
                    for (let rr = 0; rr < SIZE; rr++) {
                        if (testBoard[rr * SIZE + c] === 0 && !isFixedPath(rr, c)) {
                            colEmptyCells.push({ r: rr, c });
                        }
                    }
                }

                if (colWouldComplete && colEmptyCells.length > 0) {
                    const colTestBoard = [...testBoard];
                    for (const cell of colEmptyCells) {
                        colTestBoard[cell.r * SIZE + cell.c] = colFillType;
                    }
                    const error = checkForErrors(colTestBoard, colEmptyCells, colFillType);
                    if (error) {
                        const opposite = tryType === 1 ? 'path' : 'wall';
                        const placed = tryType === 1 ? 'wall' : 'path';
                        let reason = '';
                        if (error.type === '2x2') reason = 'it would create a 2×2 path block';
                        else if (error.type === 'invalid-dead-end') reason = `it would trap ${cellRef(error.r, error.c)} as a dead end`;
                        else if (error.type === 'dead-end-multiple') reason = `it would give the dead end at ${cellRef(error.r, error.c)} multiple exits`;
                        else if (error.type === 'disconnected') reason = 'it would disconnect the path network';

                        return {
                            message: `Cell ${cellRef(r, c)} must be a ${opposite}. Placing a ${placed} would complete column ${colToLetter(c)}, but ${reason}.`,
                            highlight: { type: 'cell', r, c },
                            cells: [{ r, c }], shouldBe: opposite
                        };
                    }
                }
            }
        }
    }

    return null;
}

// Hint: Empty cell surrounded by 3+ walls must be a wall
// An empty cell with 3+ walls around it cannot be a path (would be an invalid dead end)
function hintEmptyDeadEndMustBeWall(merged) {
    function checkEmptyCell(merged, r, c) {
            const idx = r * SIZE + c;
            // Only check empty cells
        if (merged[idx] !== 0 || isFixedPath(r, c)) return null;
            // Skip if it's a target dead end (those are valid path locations)
        if (isTargetDeadEnd(r, c)) return null;

        const { wallCount } = countNeighbors(merged, r, c);

            // If 3+ walls, this cell must be a wall (can't be a path - would be invalid dead end)
            if (wallCount >= 3) {
                return {
                    message: `Cell ${cellRef(r, c)} must be a wall. A path there would be a dead end with no exit.`,
                    highlight: { type: 'cell', r, c },
                    cells: [{ r, c }], shouldBe: 'wall'
                };
            }

    return null;
    }

    return iterateAllCellsForHint(merged, checkEmptyCell);
}

// Hint 5: 2x2 area with 3 paths
function hint2x2With3Paths(merged, forCell = null) {
    // Find all 2x2 areas with 3 paths and 1 empty cell
    const allCells = [];

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
                // If looking for a specific cell, return immediately if found
                if (forCell && emptyCell.r === forCell.r && emptyCell.c === forCell.c) {
                    return {
                        message: `Cell ${cellRef(emptyCell.r, emptyCell.c)} must be a wall to prevent a 2×2 path block.`,
                        highlight: { type: 'cell', r: emptyCell.r, c: emptyCell.c },
                        cells: [{ r: emptyCell.r, c: emptyCell.c }], shouldBe: 'wall'
                    };
                }

                // Check if this cell is already in our list
                const exists = allCells.some(c => c.r === emptyCell.r && c.c === emptyCell.c);
                if (!exists) {
                    allCells.push({ r: emptyCell.r, c: emptyCell.c });
                }
            }
        }
    }

    // If looking for a specific cell and we didn't find it, return null
    if (forCell) return null;

    if (allCells.length === 0) return null;

    // Find groups of overlapping cells (cells that are adjacent or share a 2x2 area)
    // Two cells overlap if they could be part of the same 2x2 region (within 1 step of each other)
    const groups = [];
    const used = new Set();

    for (const cell of allCells) {
        if (used.has(`${cell.r},${cell.c}`)) continue;

        // BFS to find all connected cells
        const group = [cell];
        const queue = [cell];
        used.add(`${cell.r},${cell.c}`);

        while (queue.length > 0) {
            const current = queue.shift();
            for (const other of allCells) {
                const key = `${other.r},${other.c}`;
                if (used.has(key)) continue;
                // Check if cells are close enough to be in overlapping 2x2 areas (within 2 steps)
                if (Math.abs(other.r - current.r) <= 2 && Math.abs(other.c - current.c) <= 2) {
                    used.add(key);
                    group.push(other);
                    queue.push(other);
                }
            }
        }

        groups.push(group);
    }

    // Return the largest group
    const bestGroup = groups.reduce((best, curr) => curr.length > best.length ? curr : best);

    if (bestGroup.length === 1) {
        const cell = bestGroup[0];
        return {
            message: `Cell ${cellRef(cell.r, cell.c)} must be a wall to prevent a 2×2 path block.`,
            highlight: { type: 'cell', r: cell.r, c: cell.c },
            cells: bestGroup, shouldBe: 'wall'
        };
    } else {
        const cellList = formatCellList(bestGroup);
        return {
            message: `Cells ${cellList} must be walls to prevent 2×2 path blocks.`,
            highlight: { type: 'cells', cells: bestGroup },
            cells: bestGroup, shouldBe: 'wall'
        };
    }
}

// Hint: Forced wall via "dead-end or 2x2" squeeze
// If an empty cell has exactly 2 walls and 1 path around it, then (if it were a path)
// the remaining neighbor would need to be a path to avoid an invalid dead end.
// If making that neighbor a path would complete a forbidden 2x2 path block, the cell must be a wall.
function hintDeadEndOr2x2Squeeze(merged) {
    const dirs = [
        { name: 'up', dr: -1, dc: 0 },
        { name: 'right', dr: 0, dc: 1 },
        { name: 'down', dr: 1, dc: 0 },
        { name: 'left', dr: 0, dc: -1 }
    ];

    const isWall = (r, c) => {
        if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return true; // edge counts as wall
        return merged[r * SIZE + c] === 1;
    };
    const isPath = (r, c) => {
        if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return false;
        return merged[r * SIZE + c] === 2 || isFixedPath(r, c);
    };
    const isEmpty = (r, c) => {
        if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return false;
        return merged[r * SIZE + c] === 0 && !isFixedPath(r, c);
    };

    const is2x2AllowedHere = (cells) => {
        // 2x2 paths are allowed in/near the data cache room (within 1 of stockpile)
        if (!stockpilePos) return false;
        return cells.some(cell => Math.abs(cell.r - stockpilePos.r) <= 1 && Math.abs(cell.c - stockpilePos.c) <= 1);
    };

    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            const idx = r * SIZE + c;
            if (merged[idx] !== 0 || isFixedPath(r, c)) continue;
            // If this is a target dead end node, being boxed in is allowed, so this inference isn't valid.
            if (isTargetDeadEnd(r, c)) continue;

            const wallDirs = [];
            const pathDirs = [];
            const emptyDirs = [];

            for (const d of dirs) {
                const nr = r + d.dr, nc = c + d.dc;
                if (isWall(nr, nc)) wallDirs.push(d);
                else if (isPath(nr, nc)) pathDirs.push(d);
                else if (isEmpty(nr, nc)) emptyDirs.push(d);
            }

            if (wallDirs.length !== 2 || pathDirs.length !== 1 || emptyDirs.length !== 1) continue;

            const pathDir = pathDirs[0];
            const emptyDir = emptyDirs[0];
            // Need a corner (perpendicular) so that making the empty neighbor a path could form a 2x2.
            if (pathDir.dr * emptyDir.dr + pathDir.dc * emptyDir.dc !== 0) continue;

            const xCell = { r: r + emptyDir.dr, c: c + emptyDir.dc };
            const diag = { r: r + pathDir.dr + emptyDir.dr, c: c + pathDir.dc + emptyDir.dc };
            // The diagonal must exist and already be a path for the 2x2 to be forced.
            if (!isPath(diag.r, diag.c)) continue;

            const pCell = { r: r + pathDir.dr, c: c + pathDir.dc };
            const square = [{ r, c }, xCell, pCell, diag];
            if (is2x2AllowedHere(square)) continue;

            return {
                message: `Cell ${cellRef(r, c)} must be a wall. If it were a path, it would need to connect to ${cellRef(xCell.r, xCell.c)} to avoid becoming an invalid dead end, but that would create a 2×2 block of paths.`,
                highlight: { type: 'cell', r, c },
                cells: [{ r, c }], shouldBe: 'wall'
            };
        }
    }
    return null;
}

// Hint 4: Path flanked by walls must be extended
// E.g., __WPW___ means the cell below P must be a path (otherwise P would be a dead end)
function hintPathMustExtend(merged, forCell = null) {
    // Helper to analyze a cell's neighbors (using countNeighbors but with custom board)
    function analyzeCell(r, c, testBoard) {
        // countNeighbors uses merged, so we need a custom version for test boards
        let wallCount = 0, emptyCount = 0, pathCount = 0;
        const emptyCells = [];

        for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
            const nr = r + dr, nc = c + dc;
            if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) {
                wallCount++;
                continue;
            }
            const nIdx = nr * SIZE + nc;
            if (testBoard[nIdx] === 1) {
                wallCount++;
            } else if (testBoard[nIdx] === 2 || isFixedPath(nr, nc)) {
                pathCount++;
            } else {
                emptyCount++;
                emptyCells.push({ r: nr, c: nc });
            }
        }
        return { wallCount, emptyCount, pathCount, emptyCells };
    }

    // Helper to check if a cell needs extension (has only 1 connection and 1 empty neighbor)
    function needsExtension(r, c, testBoard) {
        if (isTargetDeadEnd(r, c)) return null; // Dead ends don't need 2 connections
        const { wallCount, emptyCount, pathCount, emptyCells } = analyzeCell(r, c, testBoard);
        // Needs extension if: 3 walls + 1 empty, OR 2 walls + 1 path + 1 empty
        if ((wallCount === 3 && emptyCount === 1) || (wallCount === 2 && pathCount === 1 && emptyCount === 1)) {
            return emptyCells[0];
        }
        return null;
    }

    // Collect all possible hints and return the one with the most cells
    const candidates = [];

    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            const idx = r * SIZE + c;
            // Check if this is a path (user-placed or fixed)
            if (merged[idx] !== 2 && !isFixedPath(r, c)) continue;
            // Skip dead ends - they're supposed to have only one exit
            if (isTargetDeadEnd(r, c)) continue;

            const firstForced = needsExtension(r, c, merged);
            if (!firstForced) continue;

            // Found a path that needs extension - now follow the forced path
            const forcedCells = [firstForced];
            const visited = new Set([`${r},${c}`, `${firstForced.r},${firstForced.c}`]);

            // Create a test board with the forced cells as paths
            const testBoard = [...merged];
            testBoard[firstForced.r * SIZE + firstForced.c] = 2;

            // Keep following forced extensions
            let current = firstForced;
            while (true) {
                const next = needsExtension(current.r, current.c, testBoard);
                if (!next) break;

                const key = `${next.r},${next.c}`;
                if (visited.has(key)) break;

                visited.add(key);
                forcedCells.push(next);
                testBoard[next.r * SIZE + next.c] = 2;
                current = next;
            }

            // Build the hint
            let hint;
            if (forcedCells.length === 1) {
                const cell = forcedCells[0];
                hint = {
                    message: `Cell ${cellRef(cell.r, cell.c)} must be a path. The path at ${cellRef(r, c)} needs another connection.`,
                    highlight: { type: 'cell', r: cell.r, c: cell.c },
                    cells: forcedCells, shouldBe: 'path'
                };
            } else {
                const cellList = formatCellList(forcedCells);
                hint = {
                    message: `Cells ${cellList} must be paths. The path at ${cellRef(r, c)} needs another connection, forcing this path.`,
                    highlight: { type: 'cells', cells: forcedCells },
                    cells: forcedCells, shouldBe: 'path'
                };
            }

            // If looking for a specific cell, return immediately if this hint includes it
            if (forCell && forcedCells.some(fc => fc.r === forCell.r && fc.c === forCell.c)) {
                return hint;
            }

            candidates.push(hint);
        }
    }

    // If looking for a specific cell and we didn't find it, return null
    if (forCell) return null;

    // Return the hint with the most cells
    if (candidates.length === 0) return null;
    return candidates.reduce((best, curr) => curr.cells.length > best.cells.length ? curr : best);
}

// Hint 5: Corner with two flanking dead ends must be a wall
// E.g., if A2 and B1 are dead ends, A1 must be a wall (a path there would be cut off)
function hintCornerFlankingDeadEnds(merged) {
    function checkCorner(merged, r, c) {
            const idx = r * SIZE + c;
            // Only check empty cells
        if (merged[idx] !== 0 || isFixedPath(r, c)) return null;

            // Check each orthogonal direction
            const dirs = [
                { dr: -1, dc: 0 }, // North
                { dr: 1, dc: 0 },  // South
                { dr: 0, dc: -1 }, // West
                { dr: 0, dc: 1 }   // East
            ];

            const blocked = []; // directions blocked by wall or edge
            const deadEnds = []; // directions with dead ends

            for (const dir of dirs) {
                const nr = r + dir.dr;
                const nc = c + dir.dc;

                if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) {
                    // Edge of grid - blocked
                    blocked.push(dir);
                } else if (merged[nr * SIZE + nc] === 1) {
                    // Wall - blocked
                    blocked.push(dir);
                } else if (isTargetDeadEnd(nr, nc)) {
                    // Dead end
                    deadEnds.push({ r: nr, c: nc });
                }
            }

            // Need exactly 2 blocked directions and 2 dead end directions
        if (blocked.length !== 2 || deadEnds.length !== 2) return null;

            // Check if blocked directions are perpendicular (not opposite)
            // Perpendicular means one is vertical (dr !== 0) and one is horizontal (dc !== 0)
            const b1Vertical = blocked[0].dr !== 0;
            const b2Vertical = blocked[1].dr !== 0;

            if (b1Vertical !== b2Vertical) {
                // They are perpendicular - this forms a corner
                return {
                    message: `Cell ${cellRef(r, c)} must be a wall. The dead ends at ${cellRef(deadEnds[0].r, deadEnds[0].c)} and ${cellRef(deadEnds[1].r, deadEnds[1].c)} would cut off a path there.`,
                    highlight: { type: 'cell', r, c },
                    cells: [{ r, c }], shouldBe: 'wall'
                };
            }

    return null;
    }

    return iterateAllCellsForHint(merged, checkCorner);
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
                    highlight: { type: 'cell', r, c: checkC },
                    cells: [{ r, c: checkC }], shouldBe: 'path'
                };
            }
            // Additional check: if corner is not a marked dead end, the cell two positions away must also be a path
            // to avoid creating a 2x2 path area
            if (!isTargetDeadEnd(r, 0) && SIZE > 2) {
                const checkC2 = 2;
                if (merged[r * SIZE + checkC2] === 0 && !isFixedPath(r, checkC2)) {
                    return {
                        message: `Cell ${cellRef(r, checkC2)} must be a path. A wall there would force a dead end or 2x2 path area in the corner.`,
                        highlight: { type: 'cell', r, c: checkC2 },
                        cells: [{ r, c: checkC2 }], shouldBe: 'path'
                    };
                }
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
                    highlight: { type: 'cell', r, c: checkC },
                    cells: [{ r, c: checkC }], shouldBe: 'path'
                };
            }
            // Additional check: if corner is not a marked dead end, the cell two positions away must also be a path
            // to avoid creating a 2x2 path area
            if (!isTargetDeadEnd(r, SIZE - 1) && SIZE > 2) {
                const checkC2 = SIZE - 3;
                if (merged[r * SIZE + checkC2] === 0 && !isFixedPath(r, checkC2)) {
                    return {
                        message: `Cell ${cellRef(r, checkC2)} must be a path. A wall there would force a dead end or 2x2 path area in the corner.`,
                        highlight: { type: 'cell', r, c: checkC2 },
                        cells: [{ r, c: checkC2 }], shouldBe: 'path'
                    };
                }
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
                    highlight: { type: 'cell', r: checkR, c },
                    cells: [{ r: checkR, c }], shouldBe: 'path'
                };
            }
            // Additional check: if corner is not a marked dead end, the cell two positions away must also be a path
            // to avoid creating a 2x2 path area
            if (!isTargetDeadEnd(0, c) && SIZE > 2) {
                const checkR2 = 2;
                if (merged[checkR2 * SIZE + c] === 0 && !isFixedPath(checkR2, c)) {
                    return {
                        message: `Cell ${cellRef(checkR2, c)} must be a path. A wall there would force a dead end or 2x2 path area in the corner.`,
                        highlight: { type: 'cell', r: checkR2, c },
                        cells: [{ r: checkR2, c }], shouldBe: 'path'
                    };
                }
            }
        }

        // Bottom corner (row SIZE-1)
        const bottomIdx = (SIZE - 1) * SIZE + c;
        if (merged[bottomIdx] === 0 && !isFixedPath(SIZE - 1, c)) {
            const checkR = SIZE - 2;
            if (merged[checkR * SIZE + c] === 0 && !isFixedPath(checkR, c)) {
                return {
                    message: `Cell ${cellRef(checkR, c)} must be a path. A wall there would trap cell ${cellRef(SIZE - 1, c)} as a dead end.`,
                    highlight: { type: 'cell', r: checkR, c },
                    cells: [{ r: checkR, c }], shouldBe: 'path'
                };
            }
            // Additional check: if corner is not a marked dead end, the cell two positions away must also be a path
            // to avoid creating a 2x2 path area
            if (!isTargetDeadEnd(SIZE - 1, c) && SIZE > 2) {
                const checkR2 = SIZE - 3;
                if (merged[checkR2 * SIZE + c] === 0 && !isFixedPath(checkR2, c)) {
                    return {
                        message: `Cell ${cellRef(checkR2, c)} must be a path. A wall there would force a dead end or 2x2 path area in the corner.`,
                        highlight: { type: 'cell', r: checkR2, c },
                        cells: [{ r: checkR2, c }], shouldBe: 'path'
                    };
                }
            }
        }
    }

    return null;
}

// Hint 5: Row/column needs N-1 walls, cells next to dead ends must be walls
function hintDeadEndAdjacent(merged) {
    // Helper to check a line (row or column) for dead end adjacent hints
    function checkLineForDeadEndAdjacent(merged, isRow, index) {
        const counts = isRow ? getRowCounts(merged, index) : getColCounts(merged, index);
        if (counts.target !== SIZE - 1) return null;

        // Check adjacent lines for dead ends
        const adjIndices = isRow ? [index - 1, index + 1] : [index - 1, index + 1];
        
        for (const adjIndex of adjIndices) {
            if (adjIndex < 0 || adjIndex >= SIZE) continue;
            
            // Iterate through cells in the line
            for (let i = 0; i < SIZE; i++) {
                const deadEndR = isRow ? adjIndex : i;
                const deadEndC = isRow ? i : adjIndex;
                
                if (isTargetDeadEnd(deadEndR, deadEndC)) {
                    const cellR = isRow ? index : i;
                    const cellC = isRow ? i : index;
                    const idx = cellR * SIZE + cellC;
                    
                        if (merged[idx] === 0) {
                        const lineName = isRow ? `row ${rowToNumber(index)}` : `column ${colToLetter(index)}`;
                            return {
                            message: `Cell ${cellRef(cellR, cellC)} must be a wall. It's adjacent to a dead end, and ${lineName} needs ${SIZE - 1} walls.`,
                            highlight: { type: 'cell', r: cellR, c: cellC },
                            cells: [{ r: cellR, c: cellC }], shouldBe: 'wall'
                            };
                        }
                    }
                }
            }
        
        return null;
        }

    // Check rows
    for (let r = 0; r < SIZE; r++) {
        const hint = checkLineForDeadEndAdjacent(merged, true, r);
        if (hint) return hint;
    }

    // Check columns
    for (let c = 0; c < SIZE; c++) {
        const hint = checkLineForDeadEndAdjacent(merged, false, c);
        if (hint) return hint;
    }

    return null;
}

// Helper function to check a dead end one wall case
// Returns path hint or wall hint as appropriate
function checkDeadEndOneWallCase(merged, r, c, isRow, isEdge, remainingWalls, neighborState) {
    // neighborState contains: leftIsWall, rightIsWall, aboveIsWall, belowIsWall,
    // leftIsEmpty, rightIsEmpty, aboveIsEmpty, belowIsEmpty
    const { leftIsWall, rightIsWall, aboveIsWall, belowIsWall,
            leftIsEmpty, rightIsEmpty, aboveIsEmpty, belowIsEmpty } = neighborState;
    
    // Count existing walls around dead end
    const existingWalls = (leftIsWall ? 1 : 0) + (rightIsWall ? 1 : 0) + 
                          (aboveIsWall ? 1 : 0) + (belowIsWall ? 1 : 0);
    const wallsStillNeeded = 3 - existingWalls;
    
    if (wallsStillNeeded <= 0) return null; // Dead end already satisfied
    
    // For edge cases, we know remainingWalls === 1
    // For interior cases, we need to calculate if the dead end must get the wall
    let wallsNeededFromLine = 0;
    let potentialLineWalls = 0;
    let potentialOutsideWalls = 0;
    let maxWallsFromLine = 0;
    
    if (isEdge) {
        // Edge case: remainingWalls is always 1, and dead end must get it
        wallsNeededFromLine = 1;
    } else {
        // Interior case: calculate if dead end must get wall from the line
        if (isRow) {
            potentialLineWalls = (leftIsEmpty ? 1 : 0) + (rightIsEmpty ? 1 : 0);
            potentialOutsideWalls = (aboveIsEmpty ? 1 : 0) + (belowIsEmpty ? 1 : 0);
        } else {
            potentialLineWalls = (aboveIsEmpty ? 1 : 0) + (belowIsEmpty ? 1 : 0);
            potentialOutsideWalls = (leftIsEmpty ? 1 : 0) + (rightIsEmpty ? 1 : 0);
        }
        maxWallsFromLine = Math.min(remainingWalls, potentialLineWalls);
        wallsNeededFromLine = Math.max(0, wallsStillNeeded - potentialOutsideWalls);
    }
    
    // Only proceed if line needs exactly 1 wall AND dead end must get that wall
    if (remainingWalls !== 1 || wallsNeededFromLine < 1) {
        // Check for the other case: need 2+ walls from outside (only for interior cases)
        if (!isEdge) {
            // Calculate maxWallsFromLine if not already done
            if (maxWallsFromLine === 0) {
                if (isRow) {
                    potentialLineWalls = (leftIsEmpty ? 1 : 0) + (rightIsEmpty ? 1 : 0);
                    potentialOutsideWalls = (aboveIsEmpty ? 1 : 0) + (belowIsEmpty ? 1 : 0);
                } else {
                    potentialLineWalls = (aboveIsEmpty ? 1 : 0) + (belowIsEmpty ? 1 : 0);
                    potentialOutsideWalls = (leftIsEmpty ? 1 : 0) + (rightIsEmpty ? 1 : 0);
                }
                maxWallsFromLine = Math.min(remainingWalls, potentialLineWalls);
            }
            if (wallsStillNeeded - maxWallsFromLine >= 2) {
            const wallCells = [];
            if (isRow) {
                if (aboveIsEmpty) wallCells.push({ r: r - 1, c });
                if (belowIsEmpty) wallCells.push({ r: r + 1, c });
            } else {
                if (leftIsEmpty) wallCells.push({ r, c: c - 1 });
                if (rightIsEmpty) wallCells.push({ r, c: c + 1 });
            }
            
            if (wallCells.length > 0) {
                const cellsText = wallCells.length === 1 ? `Cell ${formatCellList(wallCells)} must be a wall` : `Cells ${formatCellList(wallCells)} must be walls`;
                const lineName = isRow ? `row ${rowToNumber(r)}` : `column ${colToLetter(c)}`;
                const perpName = isRow ? 'above and below' : 'left and right';
                            return {
                    message: `${cellsText}. The dead end at ${cellRef(r, c)} needs ${wallsStillNeeded} more wall${wallsStillNeeded > 1 ? 's' : ''}, but ${lineName} can only provide ${maxWallsFromLine}, so the cells ${perpName} must be walls.`,
                    highlight: wallCells.length === 1 ? { type: 'cell', r: wallCells[0].r, c: wallCells[0].c } : { type: 'cells', cells: wallCells },
                    cells: wallCells, shouldBe: 'wall'
                            };
                        }
                    }
                }
        return null;
    }
    
    // Find non-adjacent empty cells that must be paths
    const pathCells = isRow 
        ? findEmptyCellsInRow(merged, r, { r, c })
        : findEmptyCellsInCol(merged, c, { r, c });
    
                if (pathCells.length > 0) {
                    const cellsText = pathCells.length === 1 ? `Cell ${formatCellList(pathCells)} must be a path` : `Cells ${formatCellList(pathCells)} must be paths`;
        const lineName = isRow ? `Row ${rowToNumber(r)}` : `Column ${colToLetter(c)}`;
                    return {
            message: `${cellsText}. ${lineName} needs only 1 more wall, which must be adjacent to the dead end at ${cellRef(r, c)}.`,
                        highlight: pathCells.length === 1 ? { type: 'cell', r: pathCells[0].r, c: pathCells[0].c } : { type: 'cells', cells: pathCells },
                        cells: pathCells, shouldBe: 'path'
                    };
    }
    
    // All non-adjacent cells are already paths - check perpendicular cells
    const perpCells = getPerpendicularCells(merged, r, c, isRow ? 'row' : 'col');
    const wallCells = perpCells.filter(cell => cell.isEmpty).map(cell => ({ r: cell.r, c: cell.c }));

                if (wallCells.length > 0) {
        const cellsText = formatCellList(wallCells);
        const lineName = isRow ? `row ${rowToNumber(r)}` : `column ${colToLetter(c)}`;
        const perpLineName = isRow ? `column ${colToLetter(c)}` : `row ${rowToNumber(r)}`;
                    return {
            message: `The exit for the dead end at ${cellRef(r, c)} must be in ${lineName}. The dead end needs 3 walls total, so the adjacent cell${wallCells.length > 1 ? 's' : ''} at ${cellsText} in ${perpLineName} must be ${wallCells.length === 1 ? 'a wall' : 'walls'}.`,
                        highlight: wallCells.length === 1 ? { type: 'cell', r: wallCells[0].r, c: wallCells[0].c } : { type: 'cells', cells: wallCells },
                        cells: wallCells, shouldBe: 'wall'
                    };
                }
    
    return null;
}

// Hint 6: Dead end in edge row/col with only 1 more wall needed
// The wall must be adjacent to the dead end, so all other empty cells must be paths
// Only applies to dead ends with 2 possible exits within the row/col (not corner dead ends)
function hintEdgeDeadEndOneWall(merged) {
    // Helper to get neighbor state for a dead end
    function getNeighborState(merged, r, c) {
            const leftIdx = r * SIZE + (c - 1);
            const rightIdx = r * SIZE + (c + 1);
            const aboveIdx = (r - 1) * SIZE + c;
            const belowIdx = (r + 1) * SIZE + c;

        return {
            leftIsWall: c === 0 || merged[leftIdx] === 1,
            rightIsWall: c === SIZE - 1 || merged[rightIdx] === 1,
            aboveIsWall: r === 0 || merged[aboveIdx] === 1,
            belowIsWall: r === SIZE - 1 || merged[belowIdx] === 1,
            leftIsEmpty: c > 0 && merged[leftIdx] === 0 && !isFixedPath(r, c - 1),
            rightIsEmpty: c < SIZE - 1 && merged[rightIdx] === 0 && !isFixedPath(r, c + 1),
            aboveIsEmpty: r > 0 && merged[aboveIdx] === 0 && !isFixedPath(r - 1, c),
            belowIsEmpty: r < SIZE - 1 && merged[belowIdx] === 0 && !isFixedPath(r + 1, c)
        };
    }

    // Check edge rows (top and bottom)
    for (const r of [0, SIZE - 1]) {
        const { walls, target } = getRowCounts(merged, r);
        if (target - walls !== 1) continue;

        for (let c = 0; c < SIZE; c++) {
            if (!isTargetDeadEnd(r, c)) continue;
            // Skip corner dead ends - they only have 1 exit within the row
            if (c === 0 || c === SIZE - 1) continue;

            const neighborState = getNeighborState(merged, r, c);
            const hint = checkDeadEndOneWallCase(merged, r, c, true, true, 1, neighborState);
            if (hint) return hint;
        }
    }

    // Check edge columns (left and right)
    for (const c of [0, SIZE - 1]) {
        const { walls, target } = getColCounts(merged, c);
        if (target - walls !== 1) continue;

        for (let r = 0; r < SIZE; r++) {
            if (!isTargetDeadEnd(r, c)) continue;
            // Skip corner dead ends - they only have 1 exit within the column
            if (r === 0 || r === SIZE - 1) continue;

            const neighborState = getNeighborState(merged, r, c);
            const hint = checkDeadEndOneWallCase(merged, r, c, false, true, 1, neighborState);
            if (hint) return hint;
        }
    }

    // Check interior rows with dead ends
    for (let r = 1; r < SIZE - 1; r++) {
        const { walls, target } = getRowCounts(merged, r);
        const remainingWalls = target - walls;
        if (remainingWalls < 1) continue;

        for (let c = 0; c < SIZE; c++) {
            if (!isTargetDeadEnd(r, c)) continue;

            const neighborState = getNeighborState(merged, r, c);
            const hint = checkDeadEndOneWallCase(merged, r, c, true, false, remainingWalls, neighborState);
            if (hint) return hint;
        }
    }

    // Check interior columns with dead ends
    for (let c = 1; c < SIZE - 1; c++) {
        const { walls, target } = getColCounts(merged, c);
        const remainingWalls = target - walls;
        if (remainingWalls < 1) continue;

        for (let r = 0; r < SIZE; r++) {
            if (!isTargetDeadEnd(r, c)) continue;

            const neighborState = getNeighborState(merged, r, c);
            const hint = checkDeadEndOneWallCase(merged, r, c, false, false, remainingWalls, neighborState);
            if (hint) return hint;
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

// Validate a hint by checking if suggested cells match the solution
// Returns true if valid, false if invalid
// Hints can include: { cells: [{r, c}], shouldBe: 'wall'|'path' } for validation
// When in a fork (currentIdx > 0), skip validation - we'll detect contradictions instead
function validateHint(hint, hintName) {
    // In a fork, skip validation - let hints proceed and detect contradictions later
    if (currentIdx > 0) return true;

    if (!hint || !hint.cells || !hint.shouldBe) return true; // No validation data, assume valid

    const expectedValue = hint.shouldBe === 'wall' ? 1 : 0; // solution uses 1=wall, 0=path

    // If validateOnlyHighlighted is set, only validate the highlighted cells
    const cellsToValidate = hint.validateOnlyHighlighted && hint.highlight 
        ? (hint.highlight.type === 'cell' 
            ? [{ r: hint.highlight.r, c: hint.highlight.c }]
            : (hint.highlight.cells || []))
        : hint.cells;

    for (const cell of cellsToValidate) {
        const solutionValue = solution[cell.r][cell.c];
        if (solutionValue !== expectedValue) {
            if (DEBUG_HINTS) {
                const merged = getMergedBoard();
                console.error(`[HINT VALIDATION FAILED] ${hintName}`);
                console.error(`  Message: ${hint.message}`);
                console.error(`  Cell ${cellRef(cell.r, cell.c)} suggested as ${hint.shouldBe}, but solution has ${solutionValue === 1 ? 'wall' : 'path'}`);
                console.error(`  All suggested cells:`, hint.cells.map(c => `${cellRef(c.r, c.c)}`).join(', '));
                console.error(`  Current merged state at cell: ${merged[cell.r * SIZE + cell.c]} (0=empty, 1=wall, 2=path)`);
                console.error(`  Hint object:`, JSON.stringify(hint, null, 2));
            }
            return false;
        }
    }
    return true;
}

// Hint: Detect contradiction in fork - the original assumption must be wrong
// This checks if the fork has led to an obvious error, meaning the fork anchor should be the opposite
function hintForkContradiction(merged) {
    if (currentIdx === 0) return null; // Only applies in forks

    const fa = forkAnchors[currentIdx];
    if (!fa) return null; // No anchor set yet

    // Check for obvious contradictions (same checks as hintCheckMistakes)
    // 1. Invalid dead end (path boxed in by 3+ walls that isn't a dead end node)
    const invalidDeadEnd = findInvalidDeadEnd(merged);
    if (invalidDeadEnd) {
        return buildForkContradictionHint(fa, 'a path got boxed in as an invalid dead end');
    }

    // 2. Row/column over limit
    for (let r = 0; r < SIZE; r++) {
        const { walls, paths, target, expectedPaths } = getRowCounts(merged, r);
        if (walls > target) {
            return buildForkContradictionHint(fa, `row ${rowToNumber(r)} has too many walls`);
        }
        if (paths > expectedPaths) {
            return buildForkContradictionHint(fa, `row ${rowToNumber(r)} has too many paths`);
        }
    }
    for (let c = 0; c < SIZE; c++) {
        const { walls, paths, target, expectedPaths } = getColCounts(merged, c);
        if (walls > target) {
            return buildForkContradictionHint(fa, `column ${colToLetter(c)} has too many walls`);
        }
        if (paths > expectedPaths) {
            return buildForkContradictionHint(fa, `column ${colToLetter(c)} has too many paths`);
        }
    }

    // 3. 2x2 path block (outside vault)
    for (let r = 0; r < SIZE - 1; r++) {
        for (let c = 0; c < SIZE - 1; c++) {
            let allPaths = true;
            let nearStockpile = false;
            for (const [dr, dc] of [[0, 0], [0, 1], [1, 0], [1, 1]]) {
                const cr = r + dr, cc = c + dc;
                const idx = cr * SIZE + cc;
                if (merged[idx] !== 2 && !isFixedPath(cr, cc)) allPaths = false;
                if (stockpilePos && Math.abs(cr - stockpilePos.r) <= 1 && Math.abs(cc - stockpilePos.c) <= 1) {
                    nearStockpile = true;
                }
            }
            if (allPaths && !nearStockpile) {
                return buildForkContradictionHint(fa, 'a 2×2 path block was created');
            }
        }
    }

    // 4. Dead end with multiple paths
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            if (!isTargetDeadEnd(r, c)) continue;
            let pathCount = 0;
            for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
                const nr = r + dr, nc = c + dc;
                if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) continue;
                const nIdx = nr * SIZE + nc;
                if (merged[nIdx] === 2 || isFixedPath(nr, nc)) pathCount++;
            }
            if (pathCount > 1) {
                return buildForkContradictionHint(fa, `the dead end at ${cellRef(r, c)} has multiple exits`);
            }
        }
    }

    // 5. Cut-off section of the grid (walls separating regions so paths can't connect)
    // Check if all non-wall cells are reachable from each other
    const nonWallCells = [];
    for (let i = 0; i < SIZE * SIZE; i++) {
        if (merged[i] !== 1) nonWallCells.push(i);
    }
    if (nonWallCells.length > 1) {
        const visited = new Set();
        const stack = [nonWallCells[0]];
        visited.add(nonWallCells[0]);

        while (stack.length > 0) {
            const idx = stack.pop();
            const r = Math.floor(idx / SIZE), c = idx % SIZE;
            for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
                const nr = r + dr, nc = c + dc;
                if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) {
                    const nIdx = nr * SIZE + nc;
                    if (!visited.has(nIdx) && merged[nIdx] !== 1) {
                        visited.add(nIdx);
                        stack.push(nIdx);
                    }
                }
            }
        }

        if (visited.size < nonWallCells.length) {
            return buildForkContradictionHint(fa, 'a section of the grid got cut off by walls');
        }
    }

    return null;
}

// Helper to build the fork contradiction hint message
function buildForkContradictionHint(fa, reason) {
    let anchorDesc = '';
    let opposite = '';
    let highlight = null;

    if (fa.type === 'cell') {
        const r = Math.floor(fa.idx / SIZE);
        const c = fa.idx % SIZE;
        const currentLayer = layers[currentIdx];
        const cellValue = currentLayer[fa.idx];
        opposite = cellValue === 1 ? 'path' : 'wall';
        anchorDesc = `${cellRef(r, c)} as a ${cellValue === 1 ? 'wall' : 'path'}`;
        highlight = { type: 'cell', r, c };
    } else if (fa.type === 'row') {
        anchorDesc = `filling row ${rowToNumber(fa.index)}`;
        highlight = { type: 'row', index: fa.index };
        opposite = 'the opposite';
    } else if (fa.type === 'col') {
        anchorDesc = `filling column ${colToLetter(fa.index)}`;
        highlight = { type: 'col', index: fa.index };
        opposite = 'the opposite';
    }

    return {
        message: `Contradiction: ${reason}. Your assumption of ${anchorDesc} must be wrong. Discard this fork and place ${opposite} instead.`,
        highlight: highlight,
        noAutoApply: true // Don't auto-apply this hint
    };
}

// Main hint function - returns the first applicable hint
function getHint() {
    const merged = getMergedBoard();
    const inFork = currentIdx > 0;

    // Hints are organized by complexity level, from easiest to hardest reasoning.
    // Within each level, hints are ordered by how "obvious" they are to spot visually.
    const hintFunctions = [
        // ===== LEVEL 0: ERROR DETECTION =====
        // Not really hints - these detect mistakes or contradictions
        { name: 'hintForkContradiction', fn: () => hintForkContradiction(merged) },
        { name: 'hintCheckMistakes', fn: () => hintCheckMistakes(merged, inFork) },

        // ===== LEVEL 1: TRIVIAL (single constraint, no reasoning) =====
        // Just counting: row/col has 0 or SIZE walls, so all cells are determined
        { name: 'hintTrivialRowCol', fn: () => hintTrivialRowCol(merged) },

        // ===== LEVEL 2: SIMPLE (single rule application) =====
        // Dead end already has 3 walls, the 4th neighbor must be a path
        { name: 'hintDeadEndCanBeFinished', fn: () => hintDeadEndCanBeFinished(merged) },
        // 3 paths in a 2x2, the 4th must be a wall
        { name: 'hint2x2With3Paths', fn: () => hint2x2With3Paths(merged) },
        // Vault perimeter is complete (all 8 cells around stockpile determined)
        { name: 'hintVaultPerimeterComplete', fn: () => hintVaultPerimeterComplete(merged) },
        // Path has only one possible extension direction
        { name: 'hintPathMustExtend', fn: () => hintPathMustExtend(merged) },
        // Row/col wall count is complete, remaining cells must be paths (or vice versa)
        { name: 'hintRowColComplete', fn: () => hintRowColComplete(merged) },

        // ===== LEVEL 3: MODERATE (pattern recognition or 2-step reasoning) =====
        // Empty cell surrounded by walls/edges would be invalid dead end
        { name: 'hintEmptyDeadEndMustBeWall', fn: () => hintEmptyDeadEndMustBeWall(merged) },
        // Vault interior cells must be paths when only one vault position works
        { name: 'hintVaultInteriorMustBePath', fn: () => hintVaultInteriorMustBePath(merged) },
        // Vault exit cannot be adjacent to dead end in certain positions
        { name: 'hintVaultExitDeadEnd', fn: () => hintVaultExitDeadEnd(merged) },
        // Two adjacent dead ends: the cell between them must connect them
        { name: 'hintDeadEndAdjacent', fn: () => hintDeadEndAdjacent(merged) },
        // Corner with flanking dead ends on both edges
        { name: 'hintCornerFlankingDeadEnds', fn: () => hintCornerFlankingDeadEnds(merged) },

        // ===== LEVEL 4: ADVANCED (multi-step reasoning or constraint combination) =====
        // If cell were path, it would need a neighbor to avoid dead end, but that creates 2x2
        { name: 'hintDeadEndOr2x2Squeeze', fn: () => hintDeadEndOr2x2Squeeze(merged) },
        // Edge row/col needs 1 wall, dead end forces it to be adjacent
        { name: 'hintEdgeDeadEndOneWall', fn: () => hintEdgeDeadEndOneWall(merged) },
        // Corner dead end on edge with limited wall budget
        { name: 'hintEdgeCornerDeadEnd', fn: () => hintEdgeCornerDeadEnd(merged) },
        // Cache position constraints near board edge
        { name: 'hintCacheNearEdge', fn: () => hintCacheNearEdge(merged) },

        // ===== LEVEL 5: COMPLEX (hypothetical reasoning / lookahead) =====
        // Completing a row/col would cause an error elsewhere
        { name: 'hintRowColCompletionCausesError', fn: () => hintRowColCompletionCausesError(merged) },
        // Only 4 empty cells left with two valid solutions
        { name: 'hintTwoValidSolutions', fn: () => hintTwoValidSolutions(merged, null) },

        // ===== LEVEL 6: TRIAL AND ERROR =====
        // No logical deduction possible, must try a hypothesis
        { name: 'hintFork', fn: () => hintFork() }
    ];

    for (const { name, fn } of hintFunctions) {
        const hint = fn();
        if (hint) {
            // Validate the hint before returning it
            if (validateHint(hint, name)) {
                return hint;
            }
            // Invalid hint - skip it and try the next one
        }
    }

    return hintFork();
}

// Get a hint that includes a specific cell
// Returns the first hint that mentions the given cell, or null if no hint applies
function getHintForCell(targetR, targetC) {
    const merged = getMergedBoard();
    const inFork = currentIdx > 0;
    const forCell = { r: targetR, c: targetC };

    // Check if a hint includes the target cell
    function hintIncludesCell(hint) {
        if (!hint) return false;

        // Check if hint.cells includes the target cell
        if (hint.cells && Array.isArray(hint.cells)) {
            for (const cell of hint.cells) {
                if (cell.r === targetR && cell.c === targetC) {
                    return true;
                }
            }
        }

        // Check highlight for single cell
        if (hint.highlight) {
            if (hint.highlight.type === 'cell' &&
                hint.highlight.r === targetR && hint.highlight.c === targetC) {
                return true;
            }
            // Check highlight for multiple cells
            if (hint.highlight.type === 'cells' && hint.highlight.cells) {
                for (const cell of hint.highlight.cells) {
                    if (cell.r === targetR && cell.c === targetC) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    // Same hint functions as getHint, in the same order
    // Functions that support forCell parameter will search specifically for hints including that cell
    const hintFunctions = [
        // ===== LEVEL 0: ERROR DETECTION =====
        { name: 'hintForkContradiction', fn: () => hintForkContradiction(merged) },
        { name: 'hintCheckMistakes', fn: () => hintCheckMistakes(merged, inFork) },

        // ===== LEVEL 1: TRIVIAL =====
        { name: 'hintTrivialRowCol', fn: () => hintTrivialRowCol(merged, forCell) },
        { name: 'hintRowColComplete', fn: () => hintRowColComplete(merged, forCell) },

        // ===== LEVEL 2: SIMPLE =====
        { name: 'hintDeadEndCanBeFinished', fn: () => hintDeadEndCanBeFinished(merged, forCell) },
        { name: 'hint2x2With3Paths', fn: () => hint2x2With3Paths(merged, forCell) },
        { name: 'hintVaultPerimeterComplete', fn: () => hintVaultPerimeterComplete(merged) },
        { name: 'hintPathMustExtend', fn: () => hintPathMustExtend(merged, forCell) },

        // ===== LEVEL 3: MODERATE =====
        { name: 'hintEmptyDeadEndMustBeWall', fn: () => hintEmptyDeadEndMustBeWall(merged) },
        { name: 'hintVaultInteriorMustBePath', fn: () => hintVaultInteriorMustBePath(merged) },
        { name: 'hintVaultExitDeadEnd', fn: () => hintVaultExitDeadEnd(merged) },
        { name: 'hintDeadEndAdjacent', fn: () => hintDeadEndAdjacent(merged) },
        { name: 'hintCornerFlankingDeadEnds', fn: () => hintCornerFlankingDeadEnds(merged) },

        // ===== LEVEL 4: ADVANCED =====
        { name: 'hintDeadEndOr2x2Squeeze', fn: () => hintDeadEndOr2x2Squeeze(merged) },
        { name: 'hintEdgeDeadEndOneWall', fn: () => hintEdgeDeadEndOneWall(merged) },
        { name: 'hintEdgeCornerDeadEnd', fn: () => hintEdgeCornerDeadEnd(merged) },
        { name: 'hintCacheNearEdge', fn: () => hintCacheNearEdge(merged) },
        // ===== LEVEL 5: COMPLEX =====
        { name: 'hintRowColCompletionCausesError', fn: () => hintRowColCompletionCausesError(merged) },
        { name: 'hintTwoValidSolutions', fn: () => hintTwoValidSolutions(merged, forCell) },

        // Note: hintFork is excluded - it doesn't apply to specific cells
    ];

    for (const { name, fn } of hintFunctions) {
        const hint = fn();
        // For functions that support forCell, they return the hint directly if it includes the cell
        // For other functions, we need to check if the returned hint includes the cell
        if (hint && hintIncludesCell(hint)) {
            if (validateHint(hint, name)) {
                return hint;
            }
        }
    }

    return null;
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
        el.classList.remove('hint-highlight-cell', 'tutorial-persistent');
    });
    // Clear row highlights
    document.querySelectorAll('.hint-highlight-row').forEach(el => {
        el.classList.remove('hint-highlight-row', 'tutorial-persistent');
    });
    // Clear column highlights
    document.querySelectorAll('.hint-highlight-col').forEach(el => {
        el.classList.remove('hint-highlight-col', 'tutorial-persistent');
    });
    // Clear label highlights
    document.querySelectorAll('.hint-highlight-label').forEach(el => {
        el.classList.remove('hint-highlight-label', 'tutorial-persistent');
    });
    // Clear tutorial tool highlights
    document.querySelectorAll('.mode-btn.tutorial-tool-highlight').forEach(btn => {
        btn.classList.remove('tutorial-tool-highlight');
    });
    // Fade out and remove coordinate labels
    const coordLabels = document.querySelectorAll('.cell-coord-label');
    coordLabels.forEach(el => {
        el.classList.add('fading');
    });
    // Remove after fade animation completes
    setTimeout(() => {
        coordLabels.forEach(el => el.remove());
    }, 300);
}

// Helper to add highlight class with animation restart
function addHighlightClass(el, className) {
    // Remove and re-add to restart animation
    el.classList.remove(className);
    // Force reflow to restart animation
    void el.offsetWidth;
    el.classList.add(className);
}

// Add coordinate labels to empty cells when hint mentions specific cells
function showCellCoordinates(hint) {
    // Only show coordinates for cell-specific hints
    if (!hint || !hint.highlight) return;
    if (hint.highlight.type !== 'cell' && hint.highlight.type !== 'cells') return;

    const gridCells = document.getElementById('mainGrid').querySelectorAll('.cell');
    const merged = getMergedBoard();

    for (let i = 0; i < SIZE * SIZE; i++) {
        const r = Math.floor(i / SIZE);
        const c = i % SIZE;
        // Only add labels to empty cells (not walls, paths, dead ends, or stockpile)
        if (merged[i] !== 0) continue;
        if (isTargetDeadEnd(r, c)) continue;
        if (stockpilePos && stockpilePos.r === r && stockpilePos.c === c) continue;

        const label = document.createElement('div');
        label.className = 'cell-coord-label';
        label.textContent = cellRef(r, c);
        gridCells[i].appendChild(label);
    }
}

// Apply hint highlight based on hint type
function applyHintHighlight(hint) {
    if (!hint || !hint.highlight) return;

    const hl = hint.highlight;
    const gridCells = document.getElementById('mainGrid').querySelectorAll('.cell');

    // Show coordinate labels for cell-specific hints
    showCellCoordinates(hint);

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

function positionHintToast() {
    const toast = document.getElementById('hintToast');
    const grid = document.getElementById('mainGrid');
    if (!toast || !grid) return;

    const safe = 8; // Minimum distance from viewport edges
    const gapBelowGrid = 12; // Preferred distance below grid

    // Measure current sizes
    const gridRect = grid.getBoundingClientRect();
    const toastRect = toast.getBoundingClientRect();

    // Prefer to sit just below the grid, but clamp so the toast never touches the bottom edge.
    const preferredTop = gridRect.bottom + gapBelowGrid;
    const maxTop = window.innerHeight - safe - toastRect.height;
    const minTop = safe;

    let top = Math.min(preferredTop, maxTop);
    top = Math.max(top, minTop);

    toast.style.top = `${Math.round(top)}px`;
}

// Display hint as bottom toast (Android-style)
function showHint(hint) {
    currentHint = hint;
    const toast = document.getElementById('hintToast');
    const message = document.getElementById('hintMessage');

    message.textContent = hint.message;

    // Show toast and apply highlight immediately
    toast.classList.remove('fading');
    toast.classList.add('visible');
    positionHintToast();

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
    // Don't allow dismissing hints during tutorial mode
    if (isTutorialMode) {
        return;
    }
    hideHintToast();
};

window.addEventListener('resize', () => {
    const toast = document.getElementById('hintToast');
    if (toast && toast.classList.contains('visible')) {
        positionHintToast();
    }
});

// Apply hint cells to the board (used when Apply Hints setting is enabled)
function applyHintCells(hint) {
    if (!hint || !hint.cells || !hint.shouldBe) return false;
    if (hint.noAutoApply) return false; // Some hints should not be auto-applied (e.g., fork contradictions)

    const fillValue = hint.shouldBe === 'wall' ? 1 : 2; // 1 = wall, 2 = path
    const merged = getMergedBoard();
    let appliedAny = false;

    for (const cell of hint.cells) {
        const idx = cell.r * SIZE + cell.c;

        // Skip if cell is already filled
        if (merged[idx] !== 0) continue;

        // Skip fixed paths (dead ends, stockpile)
        if (isFixedPath(cell.r, cell.c)) continue;

        // Skip if locked by lower layer
        const isLocked = layers.slice(0, currentIdx).some(l => l[idx] !== 0);
        if (isLocked) continue;

        // Set fork anchor on first cell we apply in a fork layer
        if (currentIdx > 0 && forkAnchors[currentIdx] === null) {
            forkAnchors[currentIdx] = {type: 'cell', idx: idx};
        }

        // Apply the fill
        layers[currentIdx][idx] = fillValue;
        appliedAny = true;
    }

    if (appliedAny) {
        // Play appropriate sound
        if (fillValue === 1) {
            ChipSound.wall();
        } else {
            ChipSound.path();
        }
        moveCount++;
        update();
    }

    return appliedAny;
}

// Hint button click handler
document.getElementById('hintBtn').onclick = () => {
    if (isWon || !isHintsEnabled()) return;
    ChipSound.click();
    clearHintHighlights();
    const hint = getHint();

    // If Apply Hints is enabled and hint has cells to apply, apply them
    if (isApplyHintsEnabled() && hint && hint.cells && hint.shouldBe) {
        saveUndoState();
        applyHintCells(hint);
    }

    showHint(hint);
};
// localStorage helper functions for briefing preference (works with file:// protocol)
function setBriefingPreference(dontShow) {
    localStorage.setItem('hideBriefingOnStartup', dontShow ? '1' : '0');
}

function getBriefingPreference() {
    const value = localStorage.getItem('hideBriefingOnStartup');
    return value === '1';
}

// Show briefing dialog and sync checkbox state with preference
function showBriefingDialog() {
    const checkbox = document.getElementById('dontShowBriefingCheckbox');
    if (checkbox) {
        checkbox.checked = getBriefingPreference();
    }
    document.getElementById('briefingOverlay').style.display = 'flex';
}

// Show briefing on startup if not disabled
function showBriefingOnStartup() {
    if (!getBriefingPreference()) {
        showBriefingDialog();
    }
}

document.getElementById('briefingBtn').onclick = () => {
    ChipSound.click();
    document.getElementById('menuOverlay').classList.remove('visible');
    showBriefingDialog();
};
// Close briefing dialog
function closeBriefingDialog() {
    ChipSound.click();
    const checkbox = document.getElementById('dontShowBriefingCheckbox');
    if (checkbox) {
        setBriefingPreference(checkbox.checked);
    }
    document.getElementById('briefingOverlay').style.display = 'none';
}

document.getElementById('closeBriefingBtn').onclick = closeBriefingDialog;

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Don't trigger shortcuts when typing in input fields
    const activeElement = document.activeElement;
    if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
        // Allow Escape to close dialogs even when typing
        if (e.key === 'Escape') {
            const briefingOverlay = document.getElementById('briefingOverlay');
            if (briefingOverlay && briefingOverlay.style.display === 'flex') {
                closeBriefingDialog();
            }
        }
        return;
    }

    // Close briefing dialog on Escape key
    if (e.key === 'Escape') {
        const briefingOverlay = document.getElementById('briefingOverlay');
        if (briefingOverlay && briefingOverlay.style.display === 'flex') {
            closeBriefingDialog();
        }
        return;
    }

    // Tool selection: 1-5 for Wall, Path, Erase, Auto, Hint
    if (e.key >= '1' && e.key <= '5') {
        const toolMap = {
            '1': 'wall',
            '2': 'path',
            '3': 'erase',
            '4': 'smart',
            '5': 'hint'
        };
        const mode = toolMap[e.key];
        
        // Block hint mode if hints are not enabled
        if (mode === 'hint' && !isHintsEnabled()) {
            ChipSound.error();
            return;
        }
        
        // Block Auto and Erase tools in tutorial mode
        if (isTutorialMode && !isTutorialHintsOnly && (mode === 'smart' || mode === 'erase')) {
            ChipSound.error();
            return;
        }
        
        // In tutorial mode, block wrong tool selection
        if (isTutorialMode && !isTutorialHintsOnly && tutorialHint && tutorialHint.shouldBe) {
            const requiredTool = tutorialHint.shouldBe === 'wall' ? 'wall' : 'path';
            if (mode !== requiredTool) {
                ChipSound.error();
                return;
            }
        }
        
        const btn = document.querySelector(`.mode-btn[data-mode="${mode}"]`);
        if (btn) {
            e.preventDefault();
            btn.click();
        }
        return;
    }

    // F for Fork
    if (e.key === 'f' || e.key === 'F') {
        const addLayerBtn = document.getElementById('addLayerBtn');
        if (addLayerBtn && !addLayerBtn.disabled) {
            e.preventDefault();
            addLayerBtn.click();
        }
        return;
    }

    // C for Commit
    if (e.key === 'c' || e.key === 'C') {
        // Only trigger if not Ctrl/Cmd+C (copy)
        if (!e.ctrlKey && !e.metaKey) {
            const commitBtn = document.getElementById('commitBtn');
            if (commitBtn && !commitBtn.disabled) {
                e.preventDefault();
                commitBtn.click();
            }
        }
        return;
    }

    // D for Discard
    if (e.key === 'd' || e.key === 'D') {
        const discardBtn = document.getElementById('discardBtn');
        if (discardBtn && !discardBtn.disabled) {
            e.preventDefault();
            discardBtn.click();
        }
        return;
    }

    // N for Initialize (new puzzle)
    if (e.key === 'n' || e.key === 'N') {
        const newMazeBtn = document.getElementById('newMazeBtn');
        if (newMazeBtn && !newMazeBtn.disabled) {
            e.preventDefault();
            newMazeBtn.click();
        }
        return;
    }

    // Ctrl+Z or CMD+Z for Undo
    if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        // Only trigger if not Ctrl/Cmd+Shift+Z (redo, if implemented)
        if (!e.shiftKey) {
            const undoBtn = document.getElementById('undoBtn');
            if (undoBtn && !undoBtn.disabled) {
                e.preventDefault();
                undoBtn.click();
            }
        }
        return;
    }
});

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
    try {
        const saved = localStorage.getItem('neuralReconPrefs');
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (e) {
        console.warn('Failed to load user preferences:', e);
    }
    return { soundMuted: false, musicPlaying: true, decryptOverlay: false };
}

function saveUserPreferences() {
    const settings = {
        soundMuted: ChipSound.getMuted(),
        musicPlaying: ChipMusic.isPlaying(),
        decryptOverlay: showKey
    };
    try {
        localStorage.setItem('neuralReconPrefs', JSON.stringify(settings));
    } catch (e) {
        console.warn('Failed to save user preferences:', e);
    }
}

// Assist Mode toggle system with localStorage persistence
function loadAssistSettings() {
    try {
        const saved = localStorage.getItem('neuralReconAssist');
        if (saved) {
            const parsed = JSON.parse(saved);
            // Merge saved settings with defaults (in case new settings are added)
            Object.assign(assistSettings, parsed);
            if (parsed.visualHints) Object.assign(assistSettings.visualHints, parsed.visualHints);
            if (parsed.autoFill) Object.assign(assistSettings.autoFill, parsed.autoFill);
        }
    } catch (e) {
        console.warn('Failed to load assist settings:', e);
    }
    updateAssistUI();
}

function saveAssistSettings() {
    try {
        localStorage.setItem('neuralReconAssist', JSON.stringify(assistSettings));
    } catch (e) {
        console.warn('Failed to save assist settings:', e);
    }
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
    updateToggleUI('hintsEnabledBtn', 'hintsEnabledState', assistSettings.visualHints.hintsEnabled);
    updateToggleUI('autoFillBtn', 'autoFillState', assistSettings.autoFill.enabled);
    updateToggleUI('deadEndFillBtn', 'deadEndFillState', assistSettings.autoFill.deadEndFill);
    updateToggleUI('wallCompletionBtn', 'wallCompletionState', assistSettings.autoFill.wallCompletion);
    updateToggleUI('pathCompletionBtn', 'pathCompletionState', assistSettings.autoFill.pathCompletion);
    updateToggleUI('applyHintsBtn', 'applyHintsState', assistSettings.autoFill.applyHints);

    // Update hint button and mode visibility based on hints enabled
    updateHintVisibility();
}

// Update visibility of hint-related UI elements
function updateHintVisibility() {
    const hintsEnabled = isHintsEnabled();
    const hintBtn = document.getElementById('hintBtn');
    const modeHint = document.getElementById('modeHint');
    const applyHintsBtn = document.getElementById('applyHintsBtn');

    if (hintBtn) {
        hintBtn.style.display = hintsEnabled ? '' : 'none';
    }
    if (modeHint) {
        modeHint.style.display = hintsEnabled ? '' : 'none';
    }
    if (applyHintsBtn) {
        applyHintsBtn.style.display = hintsEnabled ? '' : 'none';
    }

    // If hints are disabled and we're in hint mode, switch to smart mode
    if (!hintsEnabled && drawingMode === 'hint') {
        drawingMode = 'smart';
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === 'smart');
        });
    }
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
    assistSettings.visualHints.enabled = assistSettings.visualHints.errorIndicators || assistSettings.visualHints.progressIndicators || assistSettings.visualHints.hintsEnabled;
    // Update autoFill.enabled based on children
    assistSettings.autoFill.enabled = assistSettings.autoFill.deadEndFill || assistSettings.autoFill.wallCompletion || assistSettings.autoFill.pathCompletion || assistSettings.autoFill.applyHints;
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

document.getElementById('hintsEnabledBtn').onclick = () => {
    ChipSound.click();
    assistSettings.visualHints.hintsEnabled = !assistSettings.visualHints.hintsEnabled;
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

document.getElementById('applyHintsBtn').onclick = () => {
    ChipSound.click();
    assistSettings.autoFill.applyHints = !assistSettings.autoFill.applyHints;
    updateParentStates();
    saveAssistSettings();
    updateAssistUI();
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

// Update stats tabs to show locked/unlocked states
function updateStatsTabs() {
    const maxUnlocked = getMaxUnlockedSize();
    document.querySelectorAll('.stats-tab').forEach(tab => {
        const size = parseInt(tab.dataset.size);
        if (size > maxUnlocked) {
            tab.classList.add('locked');
            tab.textContent = `${size}×${size} 🔒`;
        } else {
            tab.classList.remove('locked');
            tab.textContent = `${size}×${size}`;
        }
    });
}

// Stats size tab switching
document.querySelectorAll('.stats-tab').forEach(tab => {
    tab.onclick = () => {
        const size = parseInt(tab.dataset.size);
        // Don't allow clicking locked tabs
        if (!isSizeUnlocked(size)) {
            ChipSound.error();
            return;
        }
        ChipSound.click();
        document.querySelectorAll('.stats-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentStatsSize = size;
        updateSizeStats(currentStatsSize);
    };
});

document.getElementById('statsBtn').onclick = () => {
    ChipSound.click();
    document.getElementById('menuOverlay').classList.remove('visible');
    // Update locked states
    updateStatsTabs();
    // Set active tab to current puzzle size (or max unlocked if current is locked)
    const maxUnlocked = getMaxUnlockedSize();
    currentStatsSize = SIZE <= maxUnlocked ? SIZE : maxUnlocked;
    document.querySelectorAll('.stats-tab').forEach(t => {
        t.classList.toggle('active', parseInt(t.dataset.size) === currentStatsSize);
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

// Reset All Data dialog
const resetAllDataDialog = document.getElementById('resetAllDataDialog');

document.getElementById('resetAllDataBtn').onclick = () => {
    ChipSound.click();
    resetAllDataDialog.showModal();
};

document.getElementById('resetAllCancelBtn').onclick = () => {
    ChipSound.click();
    resetAllDataDialog.close();
};

document.getElementById('resetAllConfirmBtn').onclick = () => {
    ChipSound.click();

    // Clear all data
    PlayerStats.clear();
    GameState.clear();
    clearTutorialCompleted();
    clearDataVaultIntroSeen();
    
    // Clear Auto tool explanation flag
    try {
        localStorage.removeItem('hasSeenAutoToolExplanation');
    } catch (e) {
        // Ignore storage errors
    }
    
    // Clear Fork explanation flag
    try {
        localStorage.removeItem('hasSeenForkExplanation');
    } catch (e) {
        // Ignore storage errors
    }
    
    // Clear Hint explanation flag
    try {
        localStorage.removeItem('hasSeenHintExplanation');
    } catch (e) {
        // Ignore storage errors
    }

    // Reset runtime state
    winStreak = 0;
    hasCompletedTutorial = false;
    hasSeenAutoToolExplanation = false;
    hasSeenForkExplanation = false;
    hasSeenHintExplanation = false;
    hasSeenDataVaultIntro = false;

    // Update UI
    updateGridSizeSelect();

    // Close dialogs and menu
    resetAllDataDialog.close();
    closeMenu();

    // Start fresh with tutorial
    startTutorial(false);
};

// Close dialog when clicking backdrop
resetAllDataDialog.addEventListener('click', (e) => {
    if (e.target === resetAllDataDialog) {
        ChipSound.click();
        resetAllDataDialog.close();
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
        // Block hint mode if hints are not enabled
        if (btn.dataset.mode === 'hint' && !isHintsEnabled()) {
            ChipSound.error();
            return;
        }
        // Block Auto and Erase tools in tutorial mode
        if (isTutorialMode && !isTutorialHintsOnly && (btn.dataset.mode === 'smart' || btn.dataset.mode === 'erase')) {
            ChipSound.error();
            return;
        }
        
        // In tutorial mode, block wrong tool selection
        if (isTutorialMode && !isTutorialHintsOnly && tutorialHint && tutorialHint.shouldBe) {
            const requiredTool = tutorialHint.shouldBe === 'wall' ? 'wall' : 'path';
            if (btn.dataset.mode !== requiredTool) {
                ChipSound.error();
                return; // Block the tool switch
            }
        }
        
        // Check if Auto tool is already selected
        const wasAutoToolSelected = drawingMode === 'smart' && btn.dataset.mode === 'smart';
        
        ChipSound.click();
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        drawingMode = btn.dataset.mode;

        // Show Auto tool explanation on first use or when tapping already-selected Auto tool (not during tutorial)
        if (drawingMode === 'smart' && !isTutorialMode) {
            if (!hasSeenAutoToolExplanation) {
                showAutoToolExplanation();
            } else if (wasAutoToolSelected) {
                // User tapped Auto tool while it's already selected - show explanation
                const dialog = document.getElementById('autoToolDialog');
                if (dialog) {
                    dialog.showModal();
                    // Scroll to top
                    dialog.scrollTop = 0;
                }
            }
        }

        // Show Hint tool explanation on first use (not during tutorial)
        if (drawingMode === 'hint' && !isTutorialMode) {
            if (!hasSeenHintExplanation) {
                showHintExplanation();
            }
        }

        // In tutorial mode, check if correct tool is now selected and show hint if needed
        if (isTutorialMode) {
            if (tutorialHint) {
                // We have a pending hint - check if correct tool is now selected
                if (checkTutorialToolSelection(tutorialHint)) {
                    // Correct tool selected, show the stored hint
                    const toast = document.getElementById('hintToast');
                    const message = document.getElementById('hintMessage');
                    message.textContent = tutorialHint.message;
                    toast.classList.remove('fading');
                    toast.classList.add('visible', 'tutorial-mode');
                    positionHintToast();
                    clearHintHighlights();
                    applyTutorialHighlight(tutorialHint);
                }
            } else {
                // No pending hint, try to get and show next hint
                showTutorialHint();
            }
        }
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

    // Update vault description (keeping the stockpile tag and replacing size placeholder)
    const vaultDesc = document.getElementById('vaultDesc');
    if (vaultDesc && t.vaultDesc) {
        vaultDesc.innerHTML = t.vaultDesc
            .replace(/{VAULT_SIZE}/g, `${DATA_VAULT_UNLOCK_SIZE}×${DATA_VAULT_UNLOCK_SIZE}`)
            .replace(
                /Stockpile|Data Stockpile|Beehive/gi,
                `<span class="briefing-tag theme-stockpile">${t.stockpile}</span>`
            );
    }

    // Update all theme-specific spans
    document.querySelectorAll('.theme-wall').forEach(el => el.textContent = t.wall || 'Wall');
    document.querySelectorAll('.theme-path').forEach(el => el.textContent = t.path || 'Path');
    document.querySelectorAll('.theme-deadend').forEach(el => el.textContent = t.deadEnd || 'Dead End');
    document.querySelectorAll('.theme-stockpile').forEach(el => el.textContent = t.stockpile || 'Data Cache');
    document.querySelectorAll('.theme-vault').forEach(el => el.textContent = t.vault || 'Vault');
    document.querySelectorAll('.theme-fork').forEach(el => el.textContent = t.fork || 'Fork');
    document.querySelectorAll('.theme-commit').forEach(el => el.textContent = t.commit || 'Commit');
    document.querySelectorAll('.theme-discard').forEach(el => el.textContent = t.discard || 'Discard');
}

// ============================================
// TUTORIAL SYSTEM
// ============================================

// Load data vault intro seen flag from localStorage
function loadDataVaultIntroSeen() {
    try {
        return localStorage.getItem('hasSeenDataVaultIntro') === 'true';
    } catch (e) {
        return false;
    }
}

// Save data vault intro seen flag to localStorage
function saveDataVaultIntroSeen() {
    try {
        localStorage.setItem('hasSeenDataVaultIntro', 'true');
    } catch (e) {
        // Ignore storage errors
    }
}

// Load Auto tool explanation seen flag from localStorage
function loadAutoToolExplanationSeen() {
    try {
        return localStorage.getItem('hasSeenAutoToolExplanation') === 'true';
    } catch (e) {
        return false;
    }
}

// Save Auto tool explanation seen flag to localStorage
function saveAutoToolExplanationSeen() {
    try {
        localStorage.setItem('hasSeenAutoToolExplanation', 'true');
    } catch (e) {
        // Ignore storage errors
    }
}

// Show Auto tool explanation dialog
function showAutoToolExplanation() {
    if (hasSeenAutoToolExplanation) return;
    
    hasSeenAutoToolExplanation = true;
    saveAutoToolExplanationSeen();
    
    const dialog = document.getElementById('autoToolDialog');
    if (dialog) {
        dialog.showModal();
        // Scroll to top
        dialog.scrollTop = 0;
    }
}

// Load Fork explanation seen flag from localStorage
function loadForkExplanationSeen() {
    try {
        return localStorage.getItem('hasSeenForkExplanation') === 'true';
    } catch (e) {
        return false;
    }
}

// Save Fork explanation seen flag to localStorage
function saveForkExplanationSeen() {
    try {
        localStorage.setItem('hasSeenForkExplanation', 'true');
    } catch (e) {
        // Ignore storage errors
    }
}

// Show Fork explanation dialog
function showForkExplanation() {
    if (hasSeenForkExplanation) return;
    
    hasSeenForkExplanation = true;
    saveForkExplanationSeen();
    
    const dialog = document.getElementById('forkDialog');
    if (dialog) {
        dialog.showModal();
        // Scroll to top
        dialog.scrollTop = 0;
    }
}

// Load Hint explanation seen flag from localStorage
function loadHintExplanationSeen() {
    try {
        return localStorage.getItem('hasSeenHintExplanation') === 'true';
    } catch (e) {
        return false;
    }
}

// Save Hint explanation seen flag to localStorage
function saveHintExplanationSeen() {
    try {
        localStorage.setItem('hasSeenHintExplanation', 'true');
    } catch (e) {
        // Ignore storage errors
    }
}

// Show Hint explanation dialog
function showHintExplanation() {
    if (hasSeenHintExplanation) return;
    
    hasSeenHintExplanation = true;
    saveHintExplanationSeen();
    
    const dialog = document.getElementById('hintDialog');
    if (dialog) {
        dialog.showModal();
        // Scroll to top
        dialog.scrollTop = 0;
    }
}

// Load tutorial completed flag from localStorage
function loadTutorialCompleted() {
    try {
        return localStorage.getItem('hasCompletedTutorial') === 'true';
    } catch (e) {
        return false;
    }
}

// Save tutorial completed flag to localStorage
function saveTutorialCompleted() {
    try {
        localStorage.setItem('hasCompletedTutorial', 'true');
    } catch (e) {
        // Ignore storage errors
    }
}

// Clear tutorial completed flag from localStorage
function clearTutorialCompleted() {
    try {
        localStorage.removeItem('hasCompletedTutorial');
    } catch (e) {
        // Ignore storage errors
    }
}

// Clear data vault intro seen flag from localStorage
function clearDataVaultIntroSeen() {
    try {
        localStorage.removeItem('hasSeenDataVaultIntro');
    } catch (e) {
        // Ignore storage errors
    }
}

// Start tutorial mode
function startTutorial(useCurrentPuzzle = false, options = {}) {
    // Exit any existing tutorial mode
    endTutorial();

    isTutorialMode = true;
    isUserInitiatedTutorial = useCurrentPuzzle;
    isTutorialHintsOnly = !!options.hintsOnly;
    tutorialHint = null;
    lastTutorialTool = null; // Reset tool tracking
    wallSwitchCount = 0; // Reset switch counters
    pathSwitchCount = 0; // Reset switch counters

    // Close menu if open
    closeMenu();

    if (!isTutorialHintsOnly) {
        // Hide Auto and Erase tools during tutorial
        const autoBtn = document.querySelector('.mode-btn[data-mode="smart"]');
        const eraseBtn = document.querySelector('.mode-btn[data-mode="erase"]');
        if (autoBtn) autoBtn.style.display = 'none';
        if (eraseBtn) eraseBtn.style.display = 'none';

        // Hide the entire top row (header strip) during tutorial
        const headerStrip = document.querySelector('.header-strip');
        if (headerStrip) {
            headerStrip.style.display = 'none';
        }

        // Switch to Path tool (will be guided to correct tool before first hint)
        drawingMode = 'path';
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === 'path');
        });
    }

    if (!useCurrentPuzzle) {
        // Set to 4x4 and generate tutorial puzzle with specific seed
        document.getElementById('gridSizeSelect').value = '4';
        init(false, 'ZXN8YB'); // Use tutorial seed
    } else {
        // Reset current puzzle
        layers = [Array(SIZE * SIZE).fill(0)];
        forkAnchors = [null, null, null, null];
        currentIdx = 0;
        undoState = null;
        document.getElementById('undoBtn').disabled = true;
        updateButtonStates();
        render();
    }

    if (!isTutorialHintsOnly) {
        // Show intro dialog
        const dialog = document.getElementById('tutorialIntroDialog');
        if (dialog) {
            dialog.showModal();
        }
    } else {
        // Hints-only: show hints immediately (no intro dialog, no tool gating)
        setTimeout(() => {
            if (isTutorialMode && !isWon) showTutorialHint();
        }, 400); // Wait for any pending hideHintToast() cleanup to finish
    }
}

// End tutorial mode
function endTutorial() {
    isTutorialMode = false;
    tutorialHint = null;
    lastTutorialTool = null; // Reset tool tracking
    wallSwitchCount = 0; // Reset switch counters
    pathSwitchCount = 0; // Reset switch counters
    isTutorialHintsOnly = false;

    // Show Auto and Erase tools again
    const autoBtn = document.querySelector('.mode-btn[data-mode="smart"]');
    const eraseBtn = document.querySelector('.mode-btn[data-mode="erase"]');
    if (autoBtn) autoBtn.style.display = '';
    if (eraseBtn) eraseBtn.style.display = '';

    // Show the header strip again
    const headerStrip = document.querySelector('.header-strip');
    if (headerStrip) {
        headerStrip.style.display = '';
    }

    // Clear tutorial-specific UI
    const toast = document.getElementById('hintToast');
    if (toast) {
        toast.classList.remove('tutorial-mode');
    }
    clearHintHighlights();
    hideHintToast();
}

// Check if correct tool is selected for tutorial hint
function checkTutorialToolSelection(hint) {
    if (isTutorialHintsOnly) return true;
    if (!hint || !hint.shouldBe) return true; // No tool requirement, allow any

    const requiredTool = hint.shouldBe === 'wall' ? 'wall' : 'path';
    return drawingMode === requiredTool;
}

// Guide user to select correct tool in tutorial
function guideTutorialToolSelection(hint) {
    if (isTutorialHintsOnly) return;
    if (!hint || !hint.shouldBe) return;

    const requiredTool = hint.shouldBe === 'wall' ? 'wall' : 'path';
    const toolName = requiredTool === 'wall' ? 'Wall' : 'Path';

    // Highlight the required tool
    clearTutorialToolHighlight();
    const toolBtn = document.querySelector(`.mode-btn[data-mode="${requiredTool}"]`);
    if (toolBtn) {
        toolBtn.classList.add('tutorial-tool-highlight');
    }

    // Show guidance message
    const toast = document.getElementById('hintToast');
    const message = document.getElementById('hintMessage');
    message.textContent = `Select the ${toolName} tool.`;

    toast.classList.remove('fading');
    toast.classList.add('visible', 'tutorial-mode');
    positionHintToast();

    // Clear any existing timeouts
    if (hintToastTimeout) {
        clearTimeout(hintToastTimeout);
        hintToastTimeout = null;
    }
}

// Show transition message when tool changes in tutorial
function showTutorialToolTransition(requiredTool) {
    if (isTutorialHintsOnly) return;
    let messageText = '';
    
    if (requiredTool === 'wall') {
        wallSwitchCount++;
        if (wallSwitchCount === 1) {
            messageText = "Now we'll start putting in some walls.";
        } else if (wallSwitchCount === 2) {
            messageText = "Time to add more walls.";
        } else {
            messageText = "Let's continue with walls.";
        }
    } else if (requiredTool === 'path') {
        pathSwitchCount++;
        if (pathSwitchCount === 1) {
            messageText = "Looks like we have some more paths to put in now.";
        } else {
            messageText = "Let's continue with paths.";
        }
    }

    const toast = document.getElementById('hintToast');
    const message = document.getElementById('hintMessage');
    message.textContent = messageText;

    toast.classList.remove('fading');
    toast.classList.add('visible', 'tutorial-mode');
    positionHintToast();

    // Clear any existing timeouts
    if (hintToastTimeout) {
        clearTimeout(hintToastTimeout);
        hintToastTimeout = null;
    }

    // Highlight the required tool (user must manually select it)
    clearTutorialToolHighlight();
    const toolBtn = document.querySelector(`.mode-btn[data-mode="${requiredTool}"]`);
    if (toolBtn) {
        toolBtn.classList.add('tutorial-tool-highlight');
    }

    // Don't automatically switch - user must select the tool themselves
    // The tool selection handler will detect when correct tool is selected and show the hint
}

// Show the next tutorial hint
function showTutorialHint() {
    if (!isTutorialMode) return;

    const hint = getHint();
    if (!hint) {
        // No more hints - puzzle should be complete
        return;
    }

    // Hints-only tutorial: always show hint immediately (no tool gating or tool-change transitions)
    if (isTutorialHintsOnly) {
        tutorialHint = hint;

        const toast = document.getElementById('hintToast');
        const message = document.getElementById('hintMessage');
        message.textContent = hint.message;

        toast.classList.remove('fading');
        toast.classList.add('visible', 'tutorial-mode');
        positionHintToast();

        // Clear any existing timeouts - tutorial hints don't auto-hide
        if (hintToastTimeout) {
            clearTimeout(hintToastTimeout);
            hintToastTimeout = null;
        }

        clearHintHighlights();
        applyTutorialHighlight(hint);
        return;
    }

    // Determine required tool
    const requiredTool = hint.shouldBe ? (hint.shouldBe === 'wall' ? 'wall' : 'path') : null;

    // Check if tool has changed
    if (requiredTool && lastTutorialTool !== null && lastTutorialTool !== requiredTool) {
        // Tool changed - show transition message first
        tutorialHint = hint;
        lastTutorialTool = requiredTool;
        showTutorialToolTransition(requiredTool);
        return;
    }

    // Update last tool
    if (requiredTool) {
        lastTutorialTool = requiredTool;
    }

    // Check if correct tool is selected before showing hint
    if (!checkTutorialToolSelection(hint)) {
        tutorialHint = hint; // Store hint so we can show it when correct tool is selected
        guideTutorialToolSelection(hint);
        return; // Don't show hint until correct tool is selected
    }

    tutorialHint = hint;

    // Show hint in persistent mode
    const toast = document.getElementById('hintToast');
    const message = document.getElementById('hintMessage');

    message.textContent = hint.message;

    toast.classList.remove('fading');
    toast.classList.add('visible', 'tutorial-mode');
    positionHintToast();

    // Clear any existing timeouts - tutorial hints don't auto-hide
    if (hintToastTimeout) {
        clearTimeout(hintToastTimeout);
        hintToastTimeout = null;
    }

    // Apply highlight without auto-clear
    clearHintHighlights();
    applyTutorialHighlight(hint);
}

// Clear tutorial tool highlight
function clearTutorialToolHighlight() {
    document.querySelectorAll('.mode-btn.tutorial-tool-highlight').forEach(btn => {
        btn.classList.remove('tutorial-tool-highlight');
    });
}

// Apply hint highlight for tutorial (persistent, no auto-clear)
function applyTutorialHighlight(hint) {
    if (!hint || !hint.highlight) return;

    const hl = hint.highlight;
    const gridCells = document.getElementById('mainGrid').querySelectorAll('.cell');

    // Show coordinate labels
    showCellCoordinates(hint);

    // Highlight the required tool based on shouldBe
    clearTutorialToolHighlight();
    if (hint.shouldBe) {
        const toolMode = hint.shouldBe === 'wall' ? 'wall' : 'path';
        const toolBtn = document.querySelector(`.mode-btn[data-mode="${toolMode}"]`);
        if (toolBtn) {
            toolBtn.classList.add('tutorial-tool-highlight');
        }
    }

    if (hl.type === 'cell') {
        const idx = hl.r * SIZE + hl.c;
        if (gridCells[idx]) {
            gridCells[idx].classList.add('hint-highlight-cell', 'tutorial-persistent');
        }
    } else if (hl.type === 'cells') {
        for (const cell of hl.cells) {
            const idx = cell.r * SIZE + cell.c;
            if (gridCells[idx]) {
                gridCells[idx].classList.add('hint-highlight-cell', 'tutorial-persistent');
            }
        }
    } else if (hl.type === 'row') {
        for (let c = 0; c < SIZE; c++) {
            const idx = hl.index * SIZE + c;
            if (gridCells[idx]) {
                gridCells[idx].classList.add('hint-highlight-row', 'tutorial-persistent');
            }
        }
        const rowLabels = document.querySelectorAll('.row-labels .count-neon');
        if (rowLabels[hl.index]) {
            rowLabels[hl.index].classList.add('hint-highlight-label', 'tutorial-persistent');
        }
    } else if (hl.type === 'col') {
        for (let r = 0; r < SIZE; r++) {
            const idx = r * SIZE + hl.index;
            if (gridCells[idx]) {
                gridCells[idx].classList.add('hint-highlight-col', 'tutorial-persistent');
            }
        }
        const colLabels = document.querySelectorAll('.col-labels .count-neon');
        if (colLabels[hl.index]) {
            colLabels[hl.index].classList.add('hint-highlight-label', 'tutorial-persistent');
        }
    }

    // No auto-clear timeout for tutorial mode
}

// Check if a move is valid in tutorial mode
function isTutorialMoveValid(r, c, newValue) {
    if (!isTutorialMode || !tutorialHint) return true;

    // Check if this cell is part of the current hint
    if (!tutorialHint.cells) return true;

    const isHintCell = tutorialHint.cells.some(hc => hc.r === r && hc.c === c);
    if (!isHintCell) {
        // Not a hint cell - block the move
        ChipSound.error();
        return false;
    }

    // Check if the value matches what the hint expects
    const expectedValue = tutorialHint.shouldBe === 'wall' ? 1 : 2;
    if (newValue !== expectedValue) {
        // Wrong value - block the move
        ChipSound.error();
        return false;
    }

    return true;
}

// Check if all hint cells are completed
function checkTutorialHintComplete() {
    if (!isTutorialMode || !tutorialHint || !tutorialHint.cells) return false;

    const merged = getMergedBoard();
    const expectedValue = tutorialHint.shouldBe === 'wall' ? 1 : 2;

    for (const cell of tutorialHint.cells) {
        const idx = cell.r * SIZE + cell.c;
        if (merged[idx] !== expectedValue) {
            return false;
        }
    }

    return true;
}

// Called after each move in tutorial mode
function onTutorialMove() {
    if (!isTutorialMode) return;

    // Check if current hint is complete
    if (checkTutorialHintComplete()) {
        // Clear current hint and show next
        clearHintHighlights();

        // Small delay before showing next hint
        setTimeout(() => {
            if (isTutorialMode && !isWon) {
                showTutorialHint();
            }
        }, 300);
    }
}

// Show tutorial completion dialog
function showTutorialComplete() {
    const wasUserInitiated = isUserInitiatedTutorial;
    endTutorial();

    // Mark tutorial as completed (for standard tutorial only)
    if (!wasUserInitiated) {
        hasCompletedTutorial = true;
        saveTutorialCompleted();
    }

    // Show appropriate dialog based on tutorial type
    const dialogId = wasUserInitiated ? 'userTutorialCompleteDialog' : 'tutorialCompleteDialog';
    const dialog = document.getElementById(dialogId);
    if (dialog) {
        dialog.showModal();
    }
}

// Show data vault intro dialog
function showDataVaultIntro() {
    if (hasSeenDataVaultIntro) return;

    hasSeenDataVaultIntro = true;
    saveDataVaultIntroSeen();

    const dialog = document.getElementById('dataVaultIntroDialog');
    if (dialog) {
        dialog.showModal();
    }
}

window.onload = () => {
    // Keep the board sized correctly on viewport changes (rotation, URL bar collapse, etc.)
    window.addEventListener('resize', scheduleLayoutUpdate, { passive: true });
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', scheduleLayoutUpdate, { passive: true });
        window.visualViewport.addEventListener('scroll', scheduleLayoutUpdate, { passive: true });
    }

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

    // Load tutorial completed flag
    hasCompletedTutorial = loadTutorialCompleted();

    // Update grid size select to show locked/unlocked states
    updateGridSizeSelect();

    // If tutorial not completed, always start with tutorial
    if (!hasCompletedTutorial) {
        // Clear any saved state so we don't restore mid-tutorial progress
        GameState.clear();
        startTutorial(false);
    } else {
        // Try to restore saved game state, otherwise start new game
        const savedState = GameState.load();
        if (savedState) {
            restoreGameState(savedState);
        } else {
            // Start at max unlocked size (or 4x4 if just completed tutorial)
            const maxUnlocked = getMaxUnlockedSize();
            document.getElementById('gridSizeSelect').value = String(maxUnlocked);
            init(true);
        }
    }

    // One more pass after initial layout settles.
    scheduleLayoutUpdate();

    // Save game state when page is about to unload (only if tutorial completed)
    window.addEventListener('beforeunload', () => {
        if (hasCompletedTutorial && !isTutorialMode) {
            GameState.save();
        }
    });

    // Also save periodically and after state changes via visibilitychange
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden' && hasCompletedTutorial && !isTutorialMode) {
            GameState.save();
        }
    });

    // Show briefing on startup if not disabled by preference (only if tutorial completed)
    if (hasCompletedTutorial) {
        showBriefingOnStartup();
    }

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

    // Load data vault intro seen flag
    hasSeenDataVaultIntro = loadDataVaultIntroSeen();
    
    // Load Auto tool explanation seen flag
    hasSeenAutoToolExplanation = loadAutoToolExplanationSeen();
    
    // Load Fork explanation seen flag
    hasSeenForkExplanation = loadForkExplanationSeen();
    
    // Load Hint explanation seen flag
    hasSeenHintExplanation = loadHintExplanationSeen();

    // Tutorial dialog handlers
    const tutorialIntroDialog = document.getElementById('tutorialIntroDialog');
    const tutorialCompleteDialog = document.getElementById('tutorialCompleteDialog');
    const dataVaultIntroDialog = document.getElementById('dataVaultIntroDialog');

    // Tutorial intro - start button
    document.getElementById('tutorialIntroStartBtn').onclick = () => {
        ChipSound.click();
        tutorialIntroDialog.close();
        // Get the first hint to determine required tool, then guide user
        setTimeout(() => {
            const hint = getHint();
            if (hint && hint.shouldBe) {
                const requiredTool = hint.shouldBe === 'wall' ? 'wall' : 'path';
                lastTutorialTool = requiredTool; // Set initial tool tracking
                
                // Check if correct tool is already selected
                if (checkTutorialToolSelection(hint)) {
                    // Tool is already correct, show hint directly
                    tutorialHint = hint;
                    const toast = document.getElementById('hintToast');
                    const message = document.getElementById('hintMessage');
                    message.textContent = hint.message;
                    toast.classList.remove('fading');
                    toast.classList.add('visible', 'tutorial-mode');
                    positionHintToast();
                    clearHintHighlights();
                    applyTutorialHighlight(hint);
                } else {
                    // Guide user to select correct tool before showing hint
                    guideTutorialToolSelection(hint);
                    // Store hint so we can show it when correct tool is selected
                    tutorialHint = hint;
                }
            } else {
                // No tool requirement, show hint directly
            showTutorialHint();
            }
        }, 500);
    };

    // Tutorial intro - Escape key starts tutorial instead of closing
    if (tutorialIntroDialog) {
        tutorialIntroDialog.addEventListener('cancel', (e) => {
            e.preventDefault(); // Prevent default close behavior
            tutorialIntroStartBtn.click(); // Trigger start button instead
        });
    }

    // Tutorial complete - advance to main game
    function advanceFromTutorialComplete() {
        // Start a new level after tutorial
        init(false); // Keep streak, start new puzzle at current size
    }

    // Tutorial complete - continue button
    const tutorialCompleteBtn = document.getElementById('tutorialCompleteBtn');
    tutorialCompleteBtn.onclick = () => {
        ChipSound.click();
        tutorialCompleteDialog.close();
        advanceFromTutorialComplete();
    };

    // Tutorial complete - advance on any dismissal (Escape, backdrop click, etc.)
    if (tutorialCompleteDialog) {
        // Handle Escape key
        tutorialCompleteDialog.addEventListener('cancel', (e) => {
            e.preventDefault(); // Prevent default close behavior
            tutorialCompleteDialog.close();
            advanceFromTutorialComplete();
        });
    }

    // User tutorial complete - continue button
    const userTutorialCompleteDialog = document.getElementById('userTutorialCompleteDialog');
    const userTutorialCompleteBtn = document.getElementById('userTutorialCompleteBtn');
    userTutorialCompleteBtn.onclick = () => {
        ChipSound.click();
        userTutorialCompleteDialog.close();
        advanceFromTutorialComplete();
    };

    // User tutorial complete - advance on any dismissal
    if (userTutorialCompleteDialog) {
        // Handle Escape key
        userTutorialCompleteDialog.addEventListener('cancel', (e) => {
            e.preventDefault(); // Prevent default close behavior
            userTutorialCompleteDialog.close();
            advanceFromTutorialComplete();
        });
    }

    // Data vault intro - skip button
    document.getElementById('dataVaultSkipBtn').onclick = () => {
        ChipSound.click();
        dataVaultIntroDialog.close();
    };

    // Data vault intro - start tutorial button
    document.getElementById('dataVaultTutorialBtn').onclick = () => {
        ChipSound.click();
        dataVaultIntroDialog.close();
        // Data Vault guided training should be hints-only: no tool hiding/locking, no forced tool switching, no training intro dialog
        startTutorial(true, { hintsOnly: true }); // Use current puzzle
    };

    // Menu tutorial buttons
    document.getElementById('tutorialBtn').onclick = () => {
        ChipSound.click();
        startTutorial(false); // New 4x4 puzzle
    };

    document.getElementById('tutorialCurrentBtn').onclick = () => {
        ChipSound.click();
        startTutorial(true); // Current puzzle
    };

    // Auto tool explanation dialog
    const autoToolDialog = document.getElementById('autoToolDialog');
    document.getElementById('autoToolGotItBtn').onclick = () => {
        ChipSound.click();
        autoToolDialog.close();
    };

    // Fork explanation dialog
    const forkDialog = document.getElementById('forkDialog');
    document.getElementById('forkGotItBtn').onclick = () => {
        ChipSound.click();
        forkDialog.close();
    };

    // Hint explanation dialog
    const hintDialog = document.getElementById('hintDialog');
    document.getElementById('hintGotItBtn').onclick = () => {
        ChipSound.click();
        hintDialog.close();
    };

    // Level unlocked dialog buttons
    const levelUnlockedDialog = document.getElementById('levelUnlockedDialog');

    document.getElementById('stayCurrentSizeBtn').onclick = () => {
        ChipSound.click();
        levelUnlockedDialog.close();
        // Start new puzzle at current size
        init(false);
    };

    document.getElementById('tryNewSizeBtn').onclick = () => {
        ChipSound.click();
        levelUnlockedDialog.close();
        // Switch to the new size and start a puzzle
        const newSize = parseInt(levelUnlockedDialog.dataset.newSize);
        if (newSize) {
            document.getElementById('gridSizeSelect').value = newSize;
            // Special seed for first data vault puzzle
            if (newSize === DATA_VAULT_UNLOCK_SIZE) {
                init(false, DATA_VAULT_FIRST_SEED);
            } else {
                init(false);
            }
        } else {
            init(false);
        }
    };

    // Close dialogs on backdrop click
    [tutorialIntroDialog, tutorialCompleteDialog, dataVaultIntroDialog, levelUnlockedDialog, userTutorialCompleteDialog].forEach(dialog => {
        if (dialog) {
            dialog.addEventListener('click', (e) => {
                if (e.target === dialog) {
                    // Don't close tutorial intro or level unlocked by clicking backdrop
                    // Tutorial complete dialogs handle their own dismissal with advance logic
                    if (dialog !== tutorialIntroDialog && dialog !== levelUnlockedDialog && 
                        dialog !== tutorialCompleteDialog && dialog !== userTutorialCompleteDialog) {
                        dialog.close();
                    } else if (dialog === tutorialCompleteDialog || dialog === userTutorialCompleteDialog) {
                        // Backdrop click on tutorial complete - close and advance
                        dialog.close();
                        advanceFromTutorialComplete();
                    }
                }
            });
        }
    });
};