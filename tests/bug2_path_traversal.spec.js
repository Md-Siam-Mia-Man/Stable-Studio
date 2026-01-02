const { test, expect } = require('@playwright/test');
const path = require('path');
const { preloadScript } = require('./common');

test.describe('Bug 2: Path Traversal in Model Selection', () => {
    test.beforeEach(async ({ page }) => {
        // Mock Neutralino
        await page.addInitScript(preloadScript); // Use common mock if possible or custom
        // Custom mock for this test to capture spawnProcess
         await page.addInitScript(() => {
            window.Neutralino = {
                init: () => {},
                os: {
                    showMessageBox: async (t, m) => { },
                    spawnProcess: async (cmd) => {
                        window._lastSpawnCmd = cmd;
                        return { id: 123 };
                    },
                },
                filesystem: {
                    createDirectory: async () => {},
                    readDirectory: async () => [{ entry: 'model.safetensors', type: 'FILE' }],
                    getAbsolutePath: async (p) => '/abs/' + p,
                    readBinaryFile: async () => new ArrayBuffer(0),
                },
                events: { on: () => {} },
                app: { exit: () => {} },
                window: { showInspector: async () => {} }
            };
            window.NL_OS = 'Linux';

            window.addEventListener('load', () => {
                 const dd = document.getElementById('model-dropdown');
                 if(dd) dd.setAttribute('data-value', 'valid_model.safetensors');
            });
        });

        const indexPath = path.resolve(__dirname, '../resources/index.html');
        await page.goto(`file://${indexPath}`);
    });

    test('should NOT allow path traversal in model selection', async ({ page }) => {
        await page.waitForLoadState('domcontentloaded');

        await page.evaluate(async () => {
            const dd = document.getElementById('model-dropdown');
            dd.setAttribute('data-value', '../secret.txt');
            document.getElementById('prompt').value = 'test prompt';
            await window.generateImage();
        });

        const cmd = await page.evaluate(() => window._lastSpawnCmd);

        // If blocked (success), cmd is undefined.
        // If passed through (fail), cmd contains secret.txt.
        if (cmd) {
             expect(cmd).not.toContain('secret.txt');
        } else {
            expect(cmd).toBeUndefined();
        }
    });
});
