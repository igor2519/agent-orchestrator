"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
const contracts_1 = require("@app/contracts");
const globals_1 = require("@jest/globals");
const event_controller_1 = require("./event-controller");
let ExampleController = class ExampleController {
    async onSubmitted(_context) {
        return Promise.resolve();
    }
    async onOutcome(_context) {
        return Promise.resolve();
    }
    notASubscriber() {
    }
};
__decorate([
    (0, event_controller_1.OnEvent)(contracts_1.EventType.DocumentSubmitted),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ExampleController.prototype, "onSubmitted", null);
__decorate([
    (0, event_controller_1.OnEvent)(contracts_1.EventType.DocumentProcessed, contracts_1.EventType.DocumentProcessingFailed),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ExampleController.prototype, "onOutcome", null);
ExampleController = __decorate([
    (0, event_controller_1.MessageController)()
], ExampleController);
class PlainService {
}
(0, globals_1.describe)('@MessageController / @OnEvent', () => {
    (0, globals_1.it)('marks decorated classes and leaves others alone', () => {
        (0, globals_1.expect)((0, event_controller_1.isMessageController)(new ExampleController())).toBe(true);
        (0, globals_1.expect)((0, event_controller_1.isMessageController)(new PlainService())).toBe(false);
    });
    (0, globals_1.it)('records one subscription per decorated method', () => {
        const subscriptions = (0, event_controller_1.getSubscriptions)(new ExampleController());
        (0, globals_1.expect)(subscriptions).toHaveLength(2);
        (0, globals_1.expect)(subscriptions.map((s) => s.methodName).sort()).toStrictEqual([
            'onOutcome',
            'onSubmitted',
        ]);
    });
    (0, globals_1.it)('supports a method subscribing to several event types', () => {
        const outcome = (0, event_controller_1.getSubscriptions)(new ExampleController()).find((s) => s.methodName === 'onOutcome');
        (0, globals_1.expect)(outcome === null || outcome === void 0 ? void 0 : outcome.eventTypes).toStrictEqual([
            contracts_1.EventType.DocumentProcessed,
            contracts_1.EventType.DocumentProcessingFailed,
        ]);
    });
    (0, globals_1.it)('ignores undecorated methods', () => {
        const methods = (0, event_controller_1.getSubscriptions)(new ExampleController()).map((s) => s.methodName);
        (0, globals_1.expect)(methods).not.toContain('notASubscriber');
    });
    (0, globals_1.it)('reports no subscriptions for an undecorated class', () => {
        (0, globals_1.expect)((0, event_controller_1.getSubscriptions)(new PlainService())).toStrictEqual([]);
    });
});
//# sourceMappingURL=event-controller.spec.js.map