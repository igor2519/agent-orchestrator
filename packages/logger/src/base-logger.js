"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseLogger = void 0;
const request_context_1 = require("./request-context");
const types_1 = require("./types");
class BaseLogger {
    constructor(service, baseContext = {}) {
        this.service = service;
        this.baseContext = baseContext;
    }
    debug(message, context) {
        this.write(this.buildRecord(types_1.LogLevel.Debug, message, context));
    }
    log(message, context) {
        this.write(this.buildRecord(types_1.LogLevel.Info, message, context));
    }
    warn(message, context) {
        this.write(this.buildRecord(types_1.LogLevel.Warn, message, context));
    }
    error(message, error, context) {
        this.write(Object.assign(Object.assign({}, this.buildRecord(types_1.LogLevel.Error, message, context)), { error: BaseLogger.serializeError(error) }));
    }
    buildRecord(level, message, context) {
        return {
            level,
            message,
            service: this.service,
            timestamp: new Date().toISOString(),
            context: Object.assign(Object.assign(Object.assign({}, request_context_1.RequestContext.get()), this.baseContext), context),
        };
    }
    static stringify(value) {
        var _a;
        if (typeof value === 'string') {
            return value;
        }
        if (typeof value === 'object') {
            try {
                return (_a = JSON.stringify(value)) !== null && _a !== void 0 ? _a : 'undefined';
            }
            catch (_b) {
                return '[unserializable]';
            }
        }
        return typeof value === 'symbol' ? value.toString() : `${value}`;
    }
    static serializeError(error) {
        if (error === undefined || error === null) {
            return undefined;
        }
        if (error instanceof Error) {
            return { name: error.name, message: error.message, stack: error.stack };
        }
        return { name: 'UnknownError', message: BaseLogger.stringify(error) };
    }
}
exports.BaseLogger = BaseLogger;
//# sourceMappingURL=base-logger.js.map