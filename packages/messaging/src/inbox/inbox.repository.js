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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InboxRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const transactional_repository_1 = require("../persistence/transactional.repository");
const inbox_message_entity_1 = require("./inbox-message.entity");
let InboxRepository = class InboxRepository extends transactional_repository_1.TransactionalRepository {
    constructor(dataSource) {
        super(inbox_message_entity_1.InboxMessage, dataSource);
    }
    async exists(manager, eventId, consumer) {
        const existing = await this.scoped(manager).findOne({
            where: { eventId, consumer },
            select: { eventId: true },
        });
        return existing !== null;
    }
    async record(manager, eventId, consumer, type) {
        await this.scoped(manager)
            .createQueryBuilder()
            .insert()
            .values({ eventId, consumer, type })
            .orIgnore()
            .execute();
    }
    async findByEventId(eventId) {
        return this.scoped().find({ where: { eventId } });
    }
};
exports.InboxRepository = InboxRepository;
exports.InboxRepository = InboxRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource])
], InboxRepository);
//# sourceMappingURL=inbox.repository.js.map