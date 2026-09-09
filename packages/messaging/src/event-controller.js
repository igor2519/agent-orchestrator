"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSubscriptions = exports.isMessageController = exports.OnEvent = exports.MessageController = exports.EVENT_SUBSCRIPTION_METADATA = exports.EVENT_CONTROLLER_METADATA = void 0;
require("reflect-metadata");
exports.EVENT_CONTROLLER_METADATA = Symbol('EVENT_CONTROLLER_METADATA');
exports.EVENT_SUBSCRIPTION_METADATA = Symbol('EVENT_SUBSCRIPTION_METADATA');
const MessageController = () => (target) => {
    Reflect.defineMetadata(exports.EVENT_CONTROLLER_METADATA, true, target);
};
exports.MessageController = MessageController;
const OnEvent = (...eventTypes) => (target, propertyKey) => {
    var _a;
    const existing = (_a = Reflect.getMetadata(exports.EVENT_SUBSCRIPTION_METADATA, target.constructor)) !== null && _a !== void 0 ? _a : [];
    Reflect.defineMetadata(exports.EVENT_SUBSCRIPTION_METADATA, [...existing, { methodName: String(propertyKey), eventTypes }], target.constructor);
};
exports.OnEvent = OnEvent;
const isMessageController = (instance) => Reflect.getMetadata(exports.EVENT_CONTROLLER_METADATA, instance.constructor) === true;
exports.isMessageController = isMessageController;
const getSubscriptions = (instance) => {
    var _a;
    return (_a = Reflect.getMetadata(exports.EVENT_SUBSCRIPTION_METADATA, instance.constructor)) !== null && _a !== void 0 ? _a : [];
};
exports.getSubscriptions = getSubscriptions;
//# sourceMappingURL=event-controller.js.map