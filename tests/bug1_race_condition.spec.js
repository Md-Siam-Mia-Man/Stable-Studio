const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Bug 1: Race Condition (Delete then Save)', () => {
    test.beforeEach(async ({ page }) => {
        // Inject mock with controlled timing
        await page.addInitScript(() => {
            window.Neutralino = {
                init: () => {},
                os: {
                    // Simulate user taking time to select save path
                    showSaveDialog: async () => {
                        await new Promise(r => setTimeout(r, 500));
                        return 'mocked_save_path.png';
                    },
                    showMessageBox: async () => {},
                },
                filesystem: {
                    createDirectory: async () => {},
                    readDirectory: async () => [],
                    // Remove is fast or slow, but faster than showSaveDialog in this scenario
                    remove: async (p) => {
                        console.log('MockFS Remove:', p);
                        await new Promise(r => setTimeout(r, 100));
                    },
                    copy: async (src, dest) => {
                        console.log('MockFS Copy:', src, dest);
                        if (!src) throw new Error('Source path is null');
                        window._lastCopySrc = src;
                    },
                    readBinaryFile: async () => new ArrayBuffer(0),
                    getAbsolutePath: async (p) => '/abs/' + p,
                },
                events: { on: () => {} },
                app: { exit: () => {} },
                window: { showInspector: async () => {} }
            };
            window.NL_OS = 'Linux';

            // Setup initial state
            window.addEventListener('load', () => {
                 // Force state to have a current output
                 window.state.currentOutput = '/abs/outputs/test.png';
            });
        });

        const indexPath = path.resolve(__dirname, '../resources/index.html');
        await page.goto(`file://${indexPath}`);
    });

    test('should NOT copy file if it is deleted while save dialog is open', async ({ page }) => {
        // Wait for page load
        await page.waitForLoadState('domcontentloaded');

        // Verify initial state
        const initialOutput = await page.evaluate(() => window.state.currentOutput);
        expect(initialOutput).toBe('/abs/outputs/test.png');

        // Trigger Delete and Save "simultaneously"
        // In the bug scenario:
        // 1. User clicks Delete (starts remove, awaits)
        // 2. User clicks Save (starts save, checks state.currentOutput which is still valid, awaits showSaveDialog)
        // 3. remove finishes -> state.currentOutput = null
        // 4. showSaveDialog finishes -> saveCurrent resumes, calls copy(state.currentOutput, ...) -> copy(null, ...) -> Error/Crash

        // We will execute them via evaluate to simulate rapid clicks
        await page.evaluate(async () => {
            // Start delete
            const pDelete = window.deleteCurrent();
            // Start save immediately after
            const pSave = window.saveCurrent();

            await Promise.all([pDelete, pSave]);
        });

        // Check if copy was attempted with null (captured in window._lastCopySrc)
        const lastCopySrc = await page.evaluate(() => window._lastCopySrc);

        // Expectation: If bug exists, lastCopySrc might be null or the copy function threw an error.
        // If fixed, it should not have attempted to copy, or handled it gracefully.

        // However, we want to FAIL if the bug is present.
        // In the mock, if src is null, it throws 'Source path is null'.
        // But since we are inside page.evaluate, the error might be caught or logged.

        // Let's check console logs or simply check if _lastCopySrc became null
        // Actually, if the bug is present, `saveCurrent` passes `state.currentOutput` (which became null) to `copy`.
        // So `copy(null, ...)` is called.

        // If fixed, `saveCurrent` should check if `state.currentOutput` is null after `showSaveDialog` returns.

        // So, if bug is present: copy is called with null.
        // If fixed: copy is NOT called (or called with valid path if we handled it differently, but here the file is deleted so it should not copy).

        // We expect NO copy to happen.
        expect(lastCopySrc).toBeUndefined();
    });
});
