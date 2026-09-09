"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NestLoggerAdapter = void 0;
class NestLoggerAdapter {
    constructor(logger) {
        this.logger = logger;
    }
    log(message, ...optional) {
        this.logger.log(String(message), { scope: NestLoggerAdapter.scopeOf(optional) });
    }
    error(message, ...optional) {
        this.logger.error(String(message), optional[0], { scope: NestLoggerAdapter.scopeOf(optional) });
    }
    warn(message, ...optional) {
        this.logger.warn(String(message), { scope: NestLoggerAdapter.scopeOf(optional) });
    }
    debug(message, ...optional) {
        this.logger.debug(String(message), { scope: NestLoggerAdapter.scopeOf(optional) });
    }
    verbose(message, ...optional) {
        this.logger.debug(String(message), { scope: NestLoggerAdapter.scopeOf(optional) });
    }
    static scopeOf(optional) {
        const last = optional[optional.length - 1];
        return typeof last === 'string' ? last : undefined;
    }
}
exports.NestLoggerAdapter = NestLoggerAdapter;
//# sourceMappingURL=nest-logger.adapter.js.map