"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestContext = void 0;
const node_async_hooks_1 = require("node:async_hooks");
const storage = new node_async_hooks_1.AsyncLocalStorage();
exports.RequestContext = {
    run(context, fn) {
        return storage.run(context, fn);
    },
    get() {
        var _a;
        return (_a = storage.getStore()) !== null && _a !== void 0 ? _a : {};
    },
    get requestId() {
        var _a;
        return (_a = storage.getStore()) === null || _a === void 0 ? void 0 : _a.requestId;
    },
};
//# sourceMappingURL=request-context.js.map