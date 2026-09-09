"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nextAttemptAt = exports.computeBackoffMs = void 0;
const DEFAULTS = {
    baseMs: 1000,
    maxMs: 5 * 60000,
    factor: 2,
};
const computeBackoffMs = (attempt, options = {}) => {
    const { baseMs, maxMs, factor } = Object.assign(Object.assign({}, DEFAULTS), options);
    const exponential = Math.min(baseMs * factor ** Math.max(0, attempt - 1), maxMs);
    return Math.floor(Math.random() * exponential);
};
exports.computeBackoffMs = computeBackoffMs;
const nextAttemptAt = (attempt, options) => new Date(Date.now() + (0, exports.computeBackoffMs)(attempt, options));
exports.nextAttemptAt = nextAttemptAt;
//# sourceMappingURL=backoff.js.map