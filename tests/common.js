const { test, expect } = require('@playwright/test');
const path = require('path');

// Mock Neutralino API
const mockNeutralino = {
    init: () => {},
    os: {
        showMessageBox: async () => {},
        showSaveDialog: async () => 'mocked_save_path.png',
        spawnProcess: async () => ({ id: 123 }),
        open: async () => {},
    },
    filesystem: {
        createDirectory: async () => {},
        readDirectory: async () => [],
        remove: async (p) => { console.log(`[Mock] Removing ${p}`); },
        copy: async (src, dest) => { console.log(`[Mock] Copying ${src} to ${dest}`); },
        readBinaryFile: async () => new ArrayBuffer(0),
        getAbsolutePath: async (p) => '/abs/' + p,
    },
    events: {
        on: () => {},
        dispatch: () => {},
    },
    app: {
        exit: () => {},
    },
    window: {
        showInspector: async () => {},
    }
};

// Expose mock to window
const preloadScript = `
    window.Neutralino = ${JSON.stringify(mockNeutralino)};
    // Re-bind methods that cannot be serialized directly if needed, or use a more complex injection strategy.
    // Since JSON.stringify removes functions, we need to redefine them.
    window.Neutralino = {
        init: () => {},
        os: {
            showMessageBox: async (t, m) => { console.log('MessageBox:', t, m); },
            showSaveDialog: async () => 'mocked_save_path.png',
            spawnProcess: async () => ({ id: 123 }),
            open: async () => {},
        },
        filesystem: {
            createDirectory: async () => {},
            readDirectory: async () => [],
            remove: async (p) => {
                console.log('MockFS Remove:', p);
                // Simulate delay
                await new Promise(r => setTimeout(r, 100));
            },
            copy: async (src, dest) => {
                console.log('MockFS Copy:', src, dest);
                 // Simulate delay
                await new Promise(r => setTimeout(r, 100));
            },
            readBinaryFile: async () => new ArrayBuffer(0),
            getAbsolutePath: async (p) => '/abs/' + p,
        },
        events: {
            on: () => {},
            dispatch: () => {},
        },
        app: {
            exit: () => {},
        },
        window: {
            showInspector: async () => {},
        }
    };
    window.NL_OS = 'Linux';
`;

test.beforeEach(async ({ page }) => {
    await page.addInitScript(preloadScript);
    // Load the local index.html
    // We need to use file:// protocol or serve it. Playwright can handle file:// if configured or just absolute path.
    const indexPath = path.resolve(__dirname, '../resources/index.html');
    await page.goto(`file://${indexPath}`);
});

module.exports = { preloadScript };
