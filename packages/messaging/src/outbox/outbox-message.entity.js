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
exports.OutboxMessage = void 0;
const typeorm_1 = require("typeorm");
let OutboxMessage = class OutboxMessage {
};
exports.OutboxMessage = OutboxMessage;
__decorate([
    (0, typeorm_1.PrimaryColumn)('uuid'),
    __metadata("design:type", String)
], OutboxMessage.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'document_id', type: 'uuid' }),
    __metadata("design:type", String)
], OutboxMessage.prototype, "documentId", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 64 }),
    __metadata("design:type", String)
], OutboxMessage.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'routing_key', length: 128 }),
    __metadata("design:type", String)
], OutboxMessage.prototype, "routingKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb' }),
    __metadata("design:type", Object)
], OutboxMessage.prototype, "envelope", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'correlation_id', type: 'uuid' }),
    __metadata("design:type", String)
], OutboxMessage.prototype, "correlationId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'causation_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], OutboxMessage.prototype, "causationId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'request_id', type: 'varchar', length: 64, nullable: true }),
    __metadata("design:type", Object)
], OutboxMessage.prototype, "requestId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bigint', generated: 'increment' }),
    __metadata("design:type", String)
], OutboxMessage.prototype, "sequence", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'available_at', type: 'timestamptz', default: () => 'now()' }),
    __metadata("design:type", Date)
], OutboxMessage.prototype, "availableAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'published_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], OutboxMessage.prototype, "publishedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], OutboxMessage.prototype, "attempts", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_error', type: 'text', nullable: true }),
    __metadata("design:type", Object)
], OutboxMessage.prototype, "lastError", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], OutboxMessage.prototype, "createdAt", void 0);
exports.OutboxMessage = OutboxMessage = __decorate([
    (0, typeorm_1.Entity)({ name: 'outbox_messages' }),
    (0, typeorm_1.Index)(['publishedAt', 'availableAt'])
], OutboxMessage);
//# sourceMappingURL=outbox-message.entity.js.map