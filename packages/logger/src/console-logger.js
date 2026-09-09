"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsoleLogger = void 0;
const base_logger_1 = require("./base-logger");
class ConsoleLogger extends base_logger_1.BaseLogger {
    child(context) {
        return new ConsoleLogger(this.service, Object.assign(Object.assign({}, this.baseContext), context));
    }
    write(record) {
        const line = JSON.stringify(record);
        switch (record.level) {
            case 'error':
                console.error(line);
                break;
            case 'warn':
                console.warn(line);
                break;
            default:
                console.log(line);
        }
    }
}
exports.ConsoleLogger = ConsoleLogger;
//# sourceMappingURL=console-logger.js.map