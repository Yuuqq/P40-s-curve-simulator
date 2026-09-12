# Code Review: P40 S-Curve Simulator

## Executive Summary
Overall, the project is a lightweight, dependency-free frontend application with good modern practices (CSS variables, accessibility roles, Service Workers). The inputs are properly clamped and sanitized, which reduces typical security risks like XSS. However, there are notable areas for improvement regarding automated testing, global namespace management, performance, and architecture.

## CRITICAL
*(None found)*
The application does not have backend components and handles DOM manipulation safely using escaped strings and numerical conversions, which reduces critical security risks.

## HIGH
1. **Missing Automated Tests (Reliability / Test Coverage)**
   - **Location:** Repository wide.
   - **Impact:** There is currently zero automated test coverage. Critical pure functions that handle mathematical calculations (`logistic`, `computeKeyNodes`, `buildPoints` in `app.js`) are untested, leaving the application highly susceptible to regressions if the formulas or rendering logic are modified in the future.
   - **Suggestion:** Introduce a lightweight test runner (e.g., Vitest or Jest) to unit test the pure functions. Consider adding Playwright tests to cover basic UI interactions and ensure the SVG renders correctly.

## MEDIUM
1. **Global Namespace Pollution (Architecture)**
   - **Location:** `app.js` (lines 1-30, etc.)
   - **Impact:** All state variables (e.g., `compareGroups`) and functions (e.g., `update`, `computeParams`) are declared in the global scope. This pollutes the `window` object and increases the risk of variable collisions, particularly because external shared scripts (`loader.js`) are loaded on the page.
   - **Suggestion:** Wrap the logic in an IIFE (Immediately Invoked Function Expression) like `(() => { ... })();` (similar to `pm-metrics.js`) or migrate `app.js` to an ES Module (`<script type="module">`).

2. **Tight Coupling / Separation of Concerns (Architecture)**
   - **Location:** `app.js`
   - **Impact:** State management, pure math calculations, DOM interactions, and SVG rendering are all tightly coupled in one file. This makes the code harder to maintain and limits the ability to independently test the math logic.
   - **Suggestion:** Extract the mathematical models and geometry helpers into separate modules (e.g., `math.js`, `svgUtils.js`).

3. **Resize Event Handler Performance (Performance)**
   - **Location:** `app.js` (lines 322-325)
   - **Impact:** `window.addEventListener("resize", () => { update(); });` triggers an expensive DOM update on every resize tick. Even though the re-render is relatively fast, rapid execution during window resizing can cause frame drops and layout thrashing.
   - **Suggestion:** Wrap the `update()` call in a debounce function or use `requestAnimationFrame` to throttle execution during resizing.

4. **Service Worker Stale-While-Revalidate Risk (Reliability / Edge Cases)**
   - **Location:** `sw.js` (lines 50-84)
   - **Impact:** The Service Worker implements a Stale-While-Revalidate pattern. Users will receive the cached version of `index.html` and `app.js` instantly while the background fetch updates the cache. If a future release includes breaking structural changes between the HTML and JS, users might receive a mismatched, broken experience until they manually refresh the page again.
   - **Suggestion:** Consider versioning cache names more dynamically or implement an active update notification toast prompting the user to reload when a new Service Worker version activates.

## LOW
1. **Inaccurate Service Worker Comments (Documentation)**
   - **Location:** `sw.js` (lines 6-9, 49)
   - **Impact:** The block comments document strategies like "Cache-First" for static assets and "Network-First for API requests". However, the code actually uses "Stale-While-Revalidate" for static assets and completely bypasses the Service Worker for cross-origin API calls (`if (url.origin !== self.location.origin) return;`).
   - **Suggestion:** Update the documentation comments to accurately reflect the implemented network strategies.

2. **No Fallback for JavaScript Disabled (UX)**
   - **Location:** `index.html`
   - **Impact:** If JavaScript is disabled or fails to load, the user sees an incomplete layout with missing interactive elements and empty chart areas without explanation.
   - **Suggestion:** Add a `<noscript>` tag in `index.html` with a user-friendly message explaining that JavaScript is required.

3. **Potential UI Overflow with Extreme `t90` Values (Edge Cases)**
   - **Location:** `app.js` (lines 71-76)
   - **Impact:** The calculation `p.x0 + Math.log(9) / p.k` correctly handles `Infinity` if `k <= 0`, but if `k` is very small (e.g., `0.01`), `t90` could yield a valid but extremely large finite number, pushing the UI layout unexpectedly when rendered.
   - **Suggestion:** Add a boundary condition check (e.g., `t90 > 1000`) and render it as `> 1000` or limit it to standard mathematical bounds.
