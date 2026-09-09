"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.classifyError = exports.isClassifiedError = exports.PermanentError = exports.TransientError = void 0;
class TransientError extends Error {
    constructor(message, code = 'TRANSIENT_ERROR', cause) {
        super(message);
        this.code = code;
        this.cause = cause;
        this.permanent = false;
        this.name = 'TransientError';
    }
}
exports.TransientError = TransientError;
class PermanentError extends Error {
    constructor(message, code = 'PERMANENT_ERROR', cause) {
        super(message);
        this.code = code;
        this.cause = cause;
        this.permanent = true;
        this.name = 'PermanentError';
    }
}
exports.PermanentError = PermanentError;
const isClassifiedError = (error) => error instanceof TransientError || error instanceof PermanentError;
exports.isClassifiedError = isClassifiedError;
const classifyError = (error) => {
    if ((0, exports.isClassifiedError)(error)) {
        return error;
    }
    const message = error instanceof Error ? error.message : String(error);
    return new PermanentError(message, 'UNCLASSIFIED_ERROR', error);
};
exports.classifyError = classifyError;
//# sourceMappingURL=errors.js.map