# Automation Testing Recommendation

## Recommended Framework: Playwright

**Justification:**
Given the project is a web-based GUI (Neutralinojs) using standard HTML/JS/CSS, **Playwright** is the most suitable long-term solution.

### Reasons:
1.  **Headless Support:** Playwright natively supports headless webkit/chromium, which aligns with the Neutralinojs backend.
2.  **Visual Regression Testing:** It has built-in screenshot comparison tools, which are critical for testing an "Image Generation" tool (verifying the canvas output visually).
3.  **Speed:** Faster than Selenium and Cypress for parallel execution.
4.  **Mocking:** Excellent network and browser API mocking capabilities, which we simulated manually in our `tests/runner.js`. Playwright handles `window` evaluation and event dispatching much more robustly.

### Implementation Strategy:
- **Migration:** Convert `tests/runner.js` logic into Playwright spec files.
- **Mocking Neutralino:** Inject a preload script in Playwright to mock the `Neutralino` global object, similar to how we did in `jsdom`, but within a real browser context.
- **CI/CD:** Integrate with GitHub Actions to run tests on every push.

---

## Alternative: Vitest + JSDOM
If full browser simulation is too heavy, continuing with **Vitest** (instead of raw Node scripts) using **JSDOM** is a viable lightweight alternative for unit logic testing.
- **Pros:** Fast, runs in Node.
- **Cons:** No real layout rendering, harder to test Canvas interactions (Panning/Zooming).
