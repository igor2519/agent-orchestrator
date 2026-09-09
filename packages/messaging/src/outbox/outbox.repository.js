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
exports.OutboxRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const transactional_repository_1 = require("../persistence/transactional.repository");
const outbox_message_entity_1 = require("./outbox-message.entity");
let OutboxRepository = class OutboxRepository extends transactional_repository_1.TransactionalRepository {
    constructor(dataSource) {
        super(outbox_message_entity_1.OutboxMessage, dataSource);
    }
    async add(manager, message) {
        const repository = this.scoped(manager);
        return repository.save(repository.create(message));
    }
    async claimDue(batchSize) {
        return this.dataSource.transaction(async (manager) => this.scoped(manager)
            .createQueryBuilder('outbox')
            .setLock('pessimistic_write')
            .setOnLocked('skip_locked')
            .where({ publishedAt: (0, typeorm_2.IsNull)(), availableAt: (0, typeorm_2.LessThanOrEqual)(new Date()) })
            .orderBy('outbox.available_at', 'ASC')
            .addOrderBy('outbox.sequence', 'ASC')
            .limit(batchSize)
            .getMany());
    }
    async markPublished(id, attempts) {
        await this.scoped().update({ id }, { publishedAt: new Date(), attempts, lastError: null });
    }
    async markFailed(id, attempts, error, availableAt) {
        await this.scoped().update({ id }, { attempts, lastError: error, availableAt });
    }
    async countPending() {
        return this.scoped().count({ where: { publishedAt: (0, typeorm_2.IsNull)() } });
    }
    async countPublished() {
        return this.scoped().count({ where: { publishedAt: (0, typeorm_2.Not)((0, typeorm_2.IsNull)()) } });
    }
    async countFailing() {
        return this.scoped().count({ where: { publishedAt: (0, typeorm_2.IsNull)(), lastError: (0, typeorm_2.Not)((0, typeorm_2.IsNull)()) } });
    }
    async findPending(limit) {
        return this.scoped().find({
            where: { publishedAt: (0, typeorm_2.IsNull)() },
            order: { sequence: 'ASC' },
            take: limit,
        });
    }
};
exports.OutboxRepository = OutboxRepository;
exports.OutboxRepository = OutboxRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource])
], OutboxRepository);
//# sourceMappingURL=outbox.repository.js.map