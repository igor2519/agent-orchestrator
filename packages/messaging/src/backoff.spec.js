"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const backoff_1 = require("./backoff");
(0, globals_1.describe)('computeBackoffMs', () => {
    const options = { baseMs: 1000, maxMs: 60000, factor: 2 };
    (0, globals_1.it)('never returns a delay above the exponential ceiling for the attempt', () => {
        for (let attempt = 1; attempt <= 6; attempt += 1) {
            const ceiling = Math.min(options.baseMs * options.factor ** (attempt - 1), options.maxMs);
            for (let i = 0; i < 200; i += 1) {
                const delay = (0, backoff_1.computeBackoffMs)(attempt, options);
                (0, globals_1.expect)(delay).toBeGreaterThanOrEqual(0);
                (0, globals_1.expect)(delay).toBeLessThan(ceiling);
            }
        }
    });
    (0, globals_1.it)('raises the ceiling as attempts increase', () => {
        const ceilingFor = (attempt) => Math.max(...Array.from({ length: 400 }, () => (0, backoff_1.computeBackoffMs)(attempt, options)));
        (0, globals_1.expect)(ceilingFor(4)).toBeGreaterThan(ceilingFor(1));
    });
    (0, globals_1.it)('caps the ceiling at maxMs however many attempts have been made', () => {
        for (let i = 0; i < 300; i += 1) {
            (0, globals_1.expect)((0, backoff_1.computeBackoffMs)(50, options)).toBeLessThan(options.maxMs);
        }
    });
    (0, globals_1.it)('spreads concurrent retries instead of aligning them', () => {
        const delays = new Set(Array.from({ length: 100 }, () => (0, backoff_1.computeBackoffMs)(5, options)));
        (0, globals_1.expect)(delays.size).toBeGreaterThan(50);
    });
    (0, globals_1.it)('treats attempt 0 as the first attempt rather than producing a negative exponent', () => {
        (0, globals_1.expect)((0, backoff_1.computeBackoffMs)(0, options)).toBeLessThan(options.baseMs);
    });
});
(0, globals_1.describe)('nextAttemptAt', () => {
    (0, globals_1.it)('returns a future timestamp within the ceiling', () => {
        const before = Date.now();
        const at = (0, backoff_1.nextAttemptAt)(3, { baseMs: 1000, maxMs: 60000, factor: 2 });
        (0, globals_1.expect)(at.getTime()).toBeGreaterThanOrEqual(before);
        (0, globals_1.expect)(at.getTime()).toBeLessThan(before + 4000);
    });
});
//# sourceMappingURL=backoff.spec.js.map