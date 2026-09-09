"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const errors_1 = require("./errors");
(0, globals_1.describe)('classifyError', () => {
    (0, globals_1.it)('preserves an explicitly transient error', () => {
        const error = new errors_1.TransientError('broker unavailable', 'BROKER_DOWN');
        const classified = (0, errors_1.classifyError)(error);
        (0, globals_1.expect)(classified).toBe(error);
        (0, globals_1.expect)(classified.permanent).toBe(false);
    });
    (0, globals_1.it)('preserves an explicitly permanent error', () => {
        const error = new errors_1.PermanentError('unsupported type', 'UNSUPPORTED');
        (0, globals_1.expect)((0, errors_1.classifyError)(error).permanent).toBe(true);
    });
    (0, globals_1.it)('treats an unclassified error as permanent so a poison message cannot loop forever', () => {
        const classified = (0, errors_1.classifyError)(new Error('something odd'));
        (0, globals_1.expect)(classified.permanent).toBe(true);
        (0, globals_1.expect)(classified.code).toBe('UNCLASSIFIED_ERROR');
        (0, globals_1.expect)(classified.message).toBe('something odd');
    });
    (0, globals_1.it)('handles non-Error throws', () => {
        (0, globals_1.expect)((0, errors_1.classifyError)('a string').message).toBe('a string');
        (0, globals_1.expect)((0, errors_1.classifyError)(undefined).permanent).toBe(true);
    });
});
(0, globals_1.describe)('isClassifiedError', () => {
    (0, globals_1.it)('recognises only the two classified types', () => {
        (0, globals_1.expect)((0, errors_1.isClassifiedError)(new errors_1.TransientError('x'))).toBe(true);
        (0, globals_1.expect)((0, errors_1.isClassifiedError)(new errors_1.PermanentError('x'))).toBe(true);
        (0, globals_1.expect)((0, errors_1.isClassifiedError)(new Error('x'))).toBe(false);
    });
});
//# sourceMappingURL=errors.spec.js.map