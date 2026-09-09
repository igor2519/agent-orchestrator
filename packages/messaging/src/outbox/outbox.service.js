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
exports.OutboxService = void 0;
const contracts_1 = require("@app/contracts");
const logger_1 = require("@app/logger");
const common_1 = require("@nestjs/common");
const uuid_1 = require("uuid");
const outbox_repository_1 = require("./outbox.repository");
let OutboxService = class OutboxService {
    constructor(repository) {
        this.repository = repository;
    }
    async enqueue(manager, options) {
        var _a, _b, _c, _d, _e, _f;
        const requestId = (_b = (_a = options.requestId) !== null && _a !== void 0 ? _a : logger_1.RequestContext.requestId) !== null && _b !== void 0 ? _b : null;
        const envelope = {
            id: (0, uuid_1.v4)(),
            type: options.type,
            occurredAt: new Date().toISOString(),
            correlationId: options.correlationId,
            causationId: (_c = options.causationId) !== null && _c !== void 0 ? _c : null,
            requestId,
            documentId: options.documentId,
            attempt: (_d = options.attempt) !== null && _d !== void 0 ? _d : 1,
            payload: options.payload,
        };
        return this.repository.add(manager, {
            id: envelope.id,
            documentId: options.documentId,
            type: options.type,
            routingKey: (_e = options.routingKey) !== null && _e !== void 0 ? _e : contracts_1.ROUTING_KEY_BY_EVENT[options.type],
            envelope,
            correlationId: envelope.correlationId,
            causationId: envelope.causationId,
            requestId,
            availableAt: (_f = options.availableAt) !== null && _f !== void 0 ? _f : new Date(),
            publishedAt: null,
            attempts: 0,
            lastError: null,
        });
    }
};
exports.OutboxService = OutboxService;
exports.OutboxService = OutboxService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [outbox_repository_1.OutboxRepository])
], OutboxService);
//# sourceMappingURL=outbox.service.js.map