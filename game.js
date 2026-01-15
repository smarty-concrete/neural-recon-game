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
let hintsEnabled = true; // Hints toggle state

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

function init(resetStreak = true) {
    isWon = false;
    document.getElementById('victoryOverlay').classList.remove('visible');
    ChipSound.newGame();
    // Reset stats for new game
    gameStartTime = Date.now();
    moveCount = 0;
    if(resetStreak) winStreak = 0;

    SIZE = parseInt(document.getElementById('gridSizeSelect').value);

    let scaleFactor = (SIZE <= 4) ? 1.8 : (SIZE <= 6 ? 1.4 : 1.0);
    document.documentElement.style.setProperty('--grid-size', SIZE);
    document.documentElement.style.setProperty('--cell-size', `min(${10 * scaleFactor}vw, ${10 * scaleFactor}vh, 75px)`);

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
    renderMiniMap();
}

// Choose maze generation algorithm randomly (50/50)
function generateMaze() {
    if (Math.random() < 0.5) {
        generateMazeDFS();
    } else {
        generateMazeAStar();
    }
}

// DFS maze generation - creates long natural walls
function generateMazeDFS() {
    solution = Array(SIZE).fill().map(() => Array(SIZE).fill(1));
    const start = {r: Math.floor(Math.random()*SIZE), c: Math.floor(Math.random()*SIZE)};
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
            let next = neighbors[Math.floor(Math.random()*neighbors.length)];
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
    return candidates[Math.floor(Math.random() * candidates.length)];
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
    return topCandidates[Math.floor(Math.random() * topCandidates.length)];
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
        const startPoint = other[Math.floor(Math.random() * other.length)];

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
                const j = Math.floor(Math.random() * (i + 1));
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
                const j = Math.floor(Math.random() * (i + 1));
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
    if (SIZE === 6 && Math.random() > 0.25) return; // Only 25% chance for 6x6

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
    candidates.sort((a, b) => a.priority - b.priority || Math.random() - 0.5);

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
        const door = doorCandidates[Math.floor(Math.random() * doorCandidates.length)];
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
        stockpilePos = roomCells[Math.floor(Math.random() * roomCells.length)];
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

function renderMiniMap() {
    const mini = document.getElementById('miniGrid');
    mini.innerHTML = '';
    mini.style.gridTemplateColumns = `repeat(${SIZE}, 12px)`;
    for(let r=0; r<SIZE; r++) {
        for(let c=0; c<SIZE; c++) {
            const div = document.createElement('div');
            div.style.width = '12px';
            div.style.height = '12px';
            if (stockpilePos && stockpilePos.r === r && stockpilePos.c === c) {
                div.style.backgroundColor = '#ff00ff'; // Magenta for stockpile
            } else {
                div.style.backgroundColor = solution[r][c] === 1 ? '#ffaa00' : '#000';
            }
            mini.appendChild(div);
        }
    }
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
            // Check neighbors (only for dead ends, not stockpile) - requires hints
            if (isDeadEnd && hintsEnabled) {
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

    // Only fill if walls are complete (green) or paths are complete (blue)
    // This feature requires hints to be enabled
    if (!hintsEnabled) return;
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

    let allWallsCorrect = true;
    for(let i=0; i<SIZE*SIZE; i++) {
        const r = Math.floor(i/SIZE), c = i%SIZE;
        if(solution[r][c] === 1 && merged[i] !== 1) allWallsCorrect = false;
        if(merged[i] === 1 && solution[r][c] !== 1) allWallsCorrect = false;
    }
    if(allWallsCorrect) { isWon = true; triggerVictorySequence(); return; }

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
        rowPathOk[r] = hintsEnabled && !rowOk[r] && pathCount === expectedPaths;
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
        colPathOk[c] = hintsEnabled && !colOk[c] && pathCount === expectedPaths;
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
            cell.appendChild(stockpile);
        }

        if(isTargetDeadEnd(r, c)) {
            // Determine node state
            let nodeState = 'normal';
            if (erraticIndices.has(i) || playerWalls === 4) nodeState = 'erratic';
            else if (hintsEnabled && playerWalls === 3) nodeState = 'complete';
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
        } else if(playerWalls >= 3 && merged[i] !== 1) {
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
                        if (clumps.has(i) || clumps.has(nIdx)) trace.classList.add('trace-error');
                        else if (erraticIndices.has(i)) trace.classList.add('trace-erratic');
                        else if (hintsEnabled && (authenticatedEdges.has(`${u}-${v}`) || (complete3x3Cells.has(i) && complete3x3Cells.has(nIdx)))) {
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
                if (clumps.has(i)) pathState = 'error';
                else if (erraticIndices.has(i)) pathState = 'erratic';
                else if (hintsEnabled && complete3x3Cells.has(i)) pathState = 'complete-blue';
                else if (hintsEnabled && authenticatedIndices.has(i)) pathState = 'complete';

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
            const elapsed = Date.now() - gameStartTime;
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
document.getElementById('decryptBtn').onclick = () => {
    ChipSound.click();
    showKey = !showKey;
    const section = document.getElementById('answerKeySection');
    if (showKey) {
        section.classList.remove('hidden');
        section.style.display = 'flex';
    } else {
        section.classList.add('hidden');
        section.style.display = 'none';
    }
};
document.getElementById('briefingBtn').onclick = () => {
    ChipSound.click();
    document.getElementById('menuOverlay').classList.remove('visible');
    document.getElementById('briefingOverlay').style.display = 'flex';
};
document.getElementById('closeBriefingBtn').onclick = () => { ChipSound.click(); document.getElementById('briefingOverlay').style.display = 'none'; };

// Slide-in menu
document.getElementById('menuBtn').onclick = () => {
    ChipSound.click();
    document.getElementById('menuOverlay').classList.add('visible');
};
document.getElementById('menuCloseBtn').onclick = () => {
    ChipSound.click();
    document.getElementById('menuOverlay').classList.remove('visible');
};
document.getElementById('menuOverlay').onclick = (e) => {
    if (e.target.id === 'menuOverlay') {
        ChipSound.click();
        document.getElementById('menuOverlay').classList.remove('visible');
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
};

// Hints toggle with cookie persistence
function loadHintsSetting() {
    const match = document.cookie.match(/neuralReconHints=([^;]+)/);
    if (match) {
        hintsEnabled = match[1] === 'true';
    }
    // Update UI to match loaded state
    const btn = document.getElementById('hintsToggleBtn');
    const state = document.getElementById('hintsToggleState');
    if (btn && state) {
        btn.classList.toggle('off', !hintsEnabled);
        state.textContent = hintsEnabled ? 'ON' : 'OFF';
    }
}

function saveHintsSetting() {
    const expires = new Date(Date.now() + 365 * 5 * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `neuralReconHints=${hintsEnabled}; expires=${expires}; path=/; SameSite=Lax`;
}

document.getElementById('hintsToggleBtn').onclick = () => {
    ChipSound.click();
    hintsEnabled = !hintsEnabled;
    saveHintsSetting();
    const btn = document.getElementById('hintsToggleBtn');
    const state = document.getElementById('hintsToggleState');
    if (hintsEnabled) {
        btn.classList.remove('off');
        state.textContent = 'ON';
    } else {
        btn.classList.add('off');
        state.textContent = 'OFF';
    }
    update(); // Refresh display to show/hide hints
};

// Load hints setting on startup
loadHintsSetting();

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

    init(true);

    // Start background music by default
    ChipMusic.start();
    const musicBtn = document.getElementById('musicToggleBtn');
    const musicIcon = document.getElementById('musicIcon');
    if (musicBtn && musicIcon) {
        musicBtn.classList.remove('muted');
        musicIcon.textContent = '🎶';
        musicBtn.title = 'Stop Music';
    }
};