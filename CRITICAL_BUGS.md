# Critical Bugs Review

## 1. Race Condition: Delete then Save
**Severity:** High
**Description:** If a user clicks "Delete" and then immediately "Save" (before the delete operation completes), `saveCurrent` might attempt to copy a file that is being deleted or has been deleted.
**Scenario:**
1. `deleteCurrent` is called. It awaits `filesystem.remove`. Control yields.
2. `saveCurrent` is called. It checks `state.currentOutput` (still valid). It awaits `showSaveDialog`. Control yields.
3. `filesystem.remove` completes. `state.currentOutput` is set to `null`.
4. `showSaveDialog` returns. `saveCurrent` calls `filesystem.copy(state.currentOutput, ...)` where first arg is now `null`.
**Impact:** Application crash or unhandled error log.

## 2. Path Traversal in Model Selection
**Severity:** Critical
**Description:** The application trusts `data-value` from the DOM for file paths. A malicious actor could modify the DOM to point to a system file, potentially causing the backend to process sensitive files.
**Impact:** Information Disclosure.

## 3. Unhandled Preview Loop Error Leaks
**Severity:** Medium
**Description:** If `readBinaryFile` fails in the preview loop (e.g., file locked), it catches the error but doesn't abort the loop. If the error persists, it busy-loops (1s interval) doing nothing but consuming resources. If `URL.createObjectURL` throws, `lastObjectUrl` might not be updated but old one not revoked if logic is flawed.
**Impact:** Performance degradation.

---

## Fix for Bug 1 (Race Condition)

**Strategy:** Capture the file path in a local variable at the start of `saveCurrent`, AND check if it still exists/valid before copying. Or, use a mutex/flag.
Simple fix: In `deleteCurrent`, set a flag or optimistically nullify `currentOutput` before await (if we assume success) or lock the UI.
Best robust fix: In `saveCurrent`, re-validate `state.currentOutput` and file existence after `showSaveDialog`.

**Code Change:**
Modify `saveCurrent` in `resources/js/main.js`.
