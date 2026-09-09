"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isTerminalStatus = exports.TERMINAL_STATUSES = exports.FailureReason = exports.DocumentStatus = void 0;
exports.DocumentStatus = {
    Received: 'RECEIVED',
    Validated: 'VALIDATED',
    Processing: 'PROCESSING',
    Completed: 'COMPLETED',
    Failed: 'FAILED',
};
exports.FailureReason = {
    Validation: 'VALIDATION',
    Permanent: 'PERMANENT',
    AttemptsExhausted: 'ATTEMPTS_EXHAUSTED',
};
exports.TERMINAL_STATUSES = [
    exports.DocumentStatus.Completed,
    exports.DocumentStatus.Failed,
];
const isTerminalStatus = (status) => exports.TERMINAL_STATUSES.includes(status);
exports.isTerminalStatus = isTerminalStatus;
//# sourceMappingURL=document-status.js.map