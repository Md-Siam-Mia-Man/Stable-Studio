const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Feature: Persist Settings', () => {
    test.beforeEach(async ({ page }) => {
        // Mock Neutralino
        await page.addInitScript(() => {
            window.Neutralino = {
                init: () => {},
                os: { showMessageBox: async () => {} },
                filesystem: {
                    createDirectory: async () => {},
                    readDirectory: async () => [],
                    getAbsolutePath: async (p) => '/abs/' + p,
                },
                events: { on: () => {} },
                app: { exit: () => {} },
                window: { showInspector: async () => {} }
            };
            window.NL_OS = 'Linux';

            // Mock localStorage
            window.store = {};
            window.localStorage.getItem = (k) => window.store[k] || null;
            window.localStorage.setItem = (k, v) => { window.store[k] = v; };
        });

        const indexPath = path.resolve(__dirname, '../resources/index.html');
        await page.goto(`file://${indexPath}`);
    });

    test('should save and load settings', async ({ page }) => {
        await page.waitForLoadState('domcontentloaded');

        // 1. Verify default values
        await expect(page.locator('#width')).toHaveValue('512');

        // 2. Change values
        await page.fill('#width', '768');
        await page.fill('#negative-prompt', 'test negative');
        await page.locator('#width').blur();
        await page.locator('#negative-prompt').blur();

        // 3. Verify localStorage has been updated
        const settings = await page.evaluate(() => {
            return JSON.parse(localStorage.getItem('user_settings') || 'null');
        });

        expect(settings).not.toBeNull();
        expect(settings.width).toBe('768');
        expect(settings.negativePrompt).toBe('test negative');

        // 4. Reload page with preserved storage
        await page.addInitScript((saved) => {
             window.store = { 'user_settings': JSON.stringify(saved) };
             window.localStorage.getItem = (k) => window.store[k] || null;
             window.localStorage.setItem = (k, v) => { window.store[k] = v; };
        }, settings);

        await page.reload();
        await page.waitForLoadState('domcontentloaded');

        // 5. Verify values are restored
        await expect(page.locator('#width')).toHaveValue('768');
        await expect(page.locator('#negative-prompt')).toHaveValue('test negative');
    });
});
