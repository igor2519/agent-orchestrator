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
exports.MessagingOpsService = void 0;
const common_1 = require("@nestjs/common");
const inbox_service_1 = require("./inbox/inbox.service");
const outbox_repository_1 = require("./outbox/outbox.repository");
const MAX_PAGE = 200;
const DEFAULT_PAGE = 50;
let MessagingOpsService = class MessagingOpsService {
    constructor(outbox, inbox) {
        this.outbox = outbox;
        this.inbox = inbox;
    }
    async outboxStats() {
        const [pending, published, failing] = await Promise.all([
            this.outbox.countPending(),
            this.outbox.countPublished(),
            this.outbox.countFailing(),
        ]);
        return { pending, published, failing };
    }
    async pendingOutbox(limit = DEFAULT_PAGE) {
        return this.outbox.findPending(Math.min(limit, MAX_PAGE));
    }
    async inboxEntry(eventId) {
        const entries = await this.inbox.findByEventId(eventId);
        return { eventId, processed: entries.length > 0, entries };
    }
};
exports.MessagingOpsService = MessagingOpsService;
exports.MessagingOpsService = MessagingOpsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [outbox_repository_1.OutboxRepository,
        inbox_service_1.InboxService])
], MessagingOpsService);
//# sourceMappingURL=messaging-ops.service.js.map