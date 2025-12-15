// Initialize Neutralino
Neutralino.init();

// --- Configuration ---
const CONFIG = {
    backendExe: './backend/sd.exe',
    modelsDir: './models',
    outputDir: './outputs',
    tempDir: './temp',
    previewFile: 'preview.png'
};

const $ = (id) => document.getElementById(id);

window.state = {
    isGenerating: false,
    currentOutput: null,
    previewInterval: null,
    lastObjectUrl: null,
    canvas: { scale: 1, panning: false, pointX: 0, pointY: 0, startX: 0, startY: 0 }
};

// --- Init ---
async function init() {
    setupEnvironment();
    setupCanvasEvents();
    setupDropdowns();
    loadTheme();

    // Ensure directories
    try {
        await Neutralino.filesystem.createDirectory(CONFIG.outputDir);
        await Neutralino.filesystem.createDirectory(CONFIG.tempDir);
    } catch (e) { }

    await loadModels();

    Neutralino.events.on("windowClose", () => Neutralino.app.exit());
}

// --- DevTools & Env Logic ---
async function setupEnvironment() {
    // Check for debug mode argument (passed by 'neu run')
    let isDebug = false;
    if (typeof NL_ARGS !== 'undefined') {
        isDebug = NL_ARGS.some(arg => arg.includes('--debug-mode') || arg.includes('--window-enable-inspector'));
    }

    if (isDebug) {
        // Open inspector in Dev Mode
        await Neutralino.window.showInspector();
    } else {
        // Block DevTools in Production
        document.addEventListener('contextmenu', e => e.preventDefault());
        document.addEventListener('keydown', e => {
            if (
                e.key === 'F12' ||
                (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
                (e.ctrlKey && e.key === 'U')
            ) {
                e.preventDefault();
                return false;
            }
        });
    }
}

// --- Theme Logic ---
function loadTheme() {
    const saved = localStorage.getItem('theme') || 'dark';
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(saved);
}

window.toggleTheme = function (mode) {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(mode);
    localStorage.setItem('theme', mode);
};

// --- Dropdown Logic (Fixed) ---
function setupDropdowns() {
    // Close all when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.custom-dropdown')) {
            document.querySelectorAll('.dropdown-content').forEach(el => el.classList.add('hidden'));
        }
    });

    const dropdowns = document.querySelectorAll('.custom-dropdown');
    dropdowns.forEach(dd => {
        const btn = dd.querySelector('.dropdown-btn');
        const content = dd.querySelector('.dropdown-content');
        const list = dd.querySelector('ul');
        const displaySpan = dd.querySelector('.truncate');

        // Toggle visibility
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            // Close others
            document.querySelectorAll('.dropdown-content').forEach(el => {
                if (el !== content) el.classList.add('hidden');
            });
            content.classList.toggle('hidden');
        });

        // Selection
        list.addEventListener('click', (e) => {
            const li = e.target.closest('li');
            if (!li) return;

            const val = li.getAttribute('data-value');
            if (!val) return; // Ignore "Scanning..." items

            // Update State
            dd.setAttribute('data-value', val);
            displaySpan.innerText = li.innerText;

            // Visuals
            list.querySelectorAll('li').forEach(l => l.classList.remove('selected'));
            li.classList.add('selected');

            // Close
            content.classList.add('hidden');
        });
    });
}

// --- File / Model Logic ---
window.loadModels = async function () {
    const list = $('model-list');
    list.innerHTML = '<li class="px-3 py-2 text-xs opacity-50">Scanning...</li>';

    try {
        let entries = await Neutralino.filesystem.readDirectory(CONFIG.modelsDir);
        let models = entries.filter(e => e.type === 'FILE' && /\.(safetensors|gguf|bin|ckpt)$/i.test(e.entry));

        if (models.length === 0) {
            list.innerHTML = '<li class="px-3 py-2 text-xs text-red-500">No models found</li>';
        } else {
            list.innerHTML = models.map(m =>
                `<li data-value="${m.entry}">${m.entry}</li>`
            ).join('');

            // Auto select first
            const dd = $('model-dropdown');
            if (!dd.getAttribute('data-value') && models.length > 0) {
                dd.setAttribute('data-value', models[0].entry);
                $('selected-model-text').innerText = models[0].entry;
            }
        }
    } catch (e) {
        list.innerHTML = '<li class="px-3 py-2 text-xs text-red-500">Error reading directory</li>';
    }
};

window.openOutputFolder = async function () {
    let path = await resolvePath(CONFIG.outputDir);
    Neutralino.os.open(path);
};

window.deleteCurrent = async function () {
    if (!state.currentOutput) return;
    try {
        await Neutralino.filesystem.remove(state.currentOutput);
        $('result-image').classList.add('hidden');
        $('placeholder').classList.remove('hidden');
        state.currentOutput = null;
    } catch (e) { console.error(e); }
};

window.saveCurrent = async function () {
    if (!state.currentOutput) return;
    try {
        let savePath = await Neutralino.os.showSaveDialog('Save Copy', {
            defaultPath: 'favorite_image.png',
            filters: [{ name: 'Images', extensions: ['png'] }]
        });

        // Fix Race Condition: Re-check if currentOutput still exists
        if (!state.currentOutput) {
             Neutralino.os.showMessageBox("Error", "Image was deleted before saving.", "OK", "ERROR");
             return;
        }

        if (savePath) {
            await Neutralino.filesystem.copy(state.currentOutput, savePath);
        }
    } catch (e) { }
};

// --- Generation ---
window.generateImage = async function () {
    if (state.isGenerating) return;

    const prompt = $('prompt').value.trim();
    const model = $('model-dropdown').getAttribute('data-value');

    if (!model) return Neutralino.os.showMessageBox("Error", "Select a model.", "OK", "ERROR");
    if (!prompt) return Neutralino.os.showMessageBox("Warning", "Enter a prompt.", "OK", "WARNING");

    setGenerating(true);
    resetCanvas();

    try {
        let backend = await resolvePath(CONFIG.backendExe);
        let modelPath = await resolvePath(`${CONFIG.modelsDir}/${model}`);

        const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
        let outputName = `img_${timestamp}.png`;
        let outputPath = await resolvePath(`${CONFIG.outputDir}/${outputName}`);
        let previewPath = await resolvePath(`${CONFIG.tempDir}/${CONFIG.previewFile}`);

        // Get dropdown values
        const sampler = $('sampler-dropdown').getAttribute('data-value') || 'euler_a';
        const scheduler = $('scheduler-dropdown').getAttribute('data-value') || 'discrete';

        let args = [
            `"${backend}"`,
            '-m', `"${modelPath}"`,
            '-p', `"${prompt}"`,
            '-o', `"${outputPath}"`,
            '-H', $('height').value,
            '-W', $('width').value,
            '--steps', $('steps').value,
            '--cfg-scale', $('cfg').value,
            '--seed', $('seed').value,
            '--sampling-method', sampler,
            '--scheduler', scheduler,
            '--threads', $('threads').value,
            '--preview-path', `"${previewPath}"`,
            '--preview-interval', '1'
        ];

        if ($('negative-prompt').value.trim()) args.push('-n', `"${$('negative-prompt').value.trim()}"`);
        if ($('verbose').checked) args.push('-v');
        if ($('canny').checked) args.push('--canny');
        if ($('rng-cuda').checked) args.push('--rng', 'cuda');

        let command = args.join(' ');
        logLine("CMD: " + command);

        let proc = await Neutralino.os.spawnProcess(command);
        startPreviewLoop(previewPath);

        Neutralino.events.on('spawnedProcess', (evt) => {
            if (evt.detail.id !== proc.id) return;
            if (evt.detail.action === 'stdOut' || evt.detail.action === 'stdErr') {
                updateLogs(evt.detail.data);
            }
            if (evt.detail.action === 'exit') {
                stopPreviewLoop();
                setGenerating(false);
                if (evt.detail.data === 0) {
                    showFinalImage(outputPath);
                    state.currentOutput = outputPath;
                    logLine("Saved: " + outputName);
                } else {
                    logLine("Failed: Code " + evt.detail.data);
                }
            }
        });

    } catch (e) {
        setGenerating(false);
        logLine("FATAL: " + e.message);
    }
};

// --- Canvas & Helpers ---
function setupCanvasEvents() {
    const wrapper = $('canvas-wrapper');

    wrapper.addEventListener('wheel', (e) => {
        if (!$('result-image').src) return;
        e.preventDefault();
        const delta = -e.deltaY;
        const factor = delta > 0 ? 1.1 : 0.9;

        state.canvas.scale = Math.min(Math.max(0.1, state.canvas.scale * factor), 10);
        updateTransform();
    });

    wrapper.addEventListener('mousedown', (e) => {
        if (e.button !== 0 || !$('result-image').src) return;
        state.canvas.startX = e.clientX - state.canvas.pointX;
        state.canvas.startY = e.clientY - state.canvas.pointY;
        state.canvas.panning = true;
        wrapper.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
        if (!state.canvas.panning) return;
        e.preventDefault();
        state.canvas.pointX = e.clientX - state.canvas.startX;
        state.canvas.pointY = e.clientY - state.canvas.startY;
        updateTransform();
    });

    window.addEventListener('mouseup', () => {
        state.canvas.panning = false;
        wrapper.style.cursor = 'grab';
    });
}

function updateTransform() {
    $('canvas-transform').style.transform = `translate(${state.canvas.pointX}px, ${state.canvas.pointY}px) scale(${state.canvas.scale})`;
}

window.resetCanvas = function () {
    state.canvas = { scale: 1, panning: false, pointX: 0, pointY: 0, startX: 0, startY: 0 };
    updateTransform();
};

// Helper for tests
window.state = state;

async function resolvePath(p) {
    let abs = await Neutralino.filesystem.getAbsolutePath(p);
    return NL_OS === 'Windows' ? abs.replaceAll('/', '\\') : abs;
}

function setGenerating(bool) {
    state.isGenerating = bool;
    const btn = $('generate-btn');
    const bar = $('progress-bar');

    if (bool) {
        logBuffer = ""; // Reset buffer
        btn.disabled = true;
        btn.classList.add('opacity-70');
        $('progress-container').classList.remove('translate-y-[200%]');
        $('result-image').classList.add('hidden');
        $('placeholder').classList.remove('hidden');
    } else {
        btn.disabled = false;
        btn.classList.remove('opacity-70');
        $('progress-container').classList.add('translate-y-[200%]');
        bar.style.width = '0%';
    }
}

let logBuffer = "";
let logFlushPending = false;

function updateLogs(text) {
    logBuffer += text;
    if (!logFlushPending) {
        logFlushPending = true;
        requestAnimationFrame(flushLogs);
    }
}

function flushLogs() {
    if (!logBuffer) {
        logFlushPending = false;
        return;
    }

    const log = $('cmd-logs');
    const chunk = logBuffer; // Snap current buffer
    logBuffer = ""; // Clear
    logFlushPending = false;

    // Batch DOM update
    log.value += chunk;
    log.scrollTop = log.scrollHeight;

    // Process Progress from chunk (find last match)
    const clean = chunk.replace(/\n/g, ' ').trim();
    if (clean) $('current-log-line').innerText = clean.slice(-50);

    // Simple regex to find last step progress in the chunk
    // Matches "Step X/Y" or "X/Y" patterns depending on backend, keeping original regex logic
    // Original: text.match(/(\d+)\/(\d+)/) - finds FIRST match.
    // We should probably look for matches in the whole chunk.
    const matches = [...chunk.matchAll(/(\d+)\/(\d+)/g)];
    if (matches.length > 0) {
        const lastMatch = matches[matches.length - 1];
        const cur = parseInt(lastMatch[1]);
        const tot = parseInt(lastMatch[2]);
        if (tot > 0) {
            const pct = (cur / tot) * 100;
            $('progress-bar').style.width = `${pct}%`;
            $('progress-percent').innerText = `${Math.floor(pct)}%`;
            $('status-text').innerText = `Step ${cur}/${tot}`;
        }
    }
}

function logLine(msg) {
    updateLogs(`\n[UI] ${msg}`);
}

function startPreviewLoop(path) {
    if (state.previewInterval) clearInterval(state.previewInterval);
    state.previewInterval = setInterval(async () => {
        try {
            let buf = await Neutralino.filesystem.readBinaryFile(path);
            // If stopped during read, abort
            if (!state.previewInterval) return;

            if (state.lastObjectUrl) URL.revokeObjectURL(state.lastObjectUrl);
            let url = URL.createObjectURL(new Blob([buf], { type: 'image/png' }));
            state.lastObjectUrl = url;
            const img = $('result-image');
            img.src = url;
            img.classList.remove('hidden');
            $('placeholder').classList.add('hidden');
        } catch (e) { }
    }, 1000);
}

function stopPreviewLoop() {
    if (state.previewInterval) clearInterval(state.previewInterval);
    state.previewInterval = null;
    if (state.lastObjectUrl) {
        URL.revokeObjectURL(state.lastObjectUrl);
        state.lastObjectUrl = null;
    }
}

async function showFinalImage(path) {
    try {
        let buf = await Neutralino.filesystem.readBinaryFile(path);
        if (state.lastObjectUrl) URL.revokeObjectURL(state.lastObjectUrl);
        let url = URL.createObjectURL(new Blob([buf], { type: 'image/png' }));
        state.lastObjectUrl = url;
        const img = $('result-image');
        img.src = url;
        img.classList.remove('hidden');
        $('placeholder').classList.add('hidden');
    } catch (e) { }
}

init();