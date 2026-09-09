"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionalRepository = void 0;
class TransactionalRepository {
    constructor(entity, dataSource) {
        this.entity = entity;
        this.dataSource = dataSource;
    }
    scoped(manager) {
        return (manager !== null && manager !== void 0 ? manager : this.dataSource.manager).getRepository(this.entity);
    }
}
exports.TransactionalRepository = TransactionalRepository;
//# sourceMappingURL=transactional.repository.js.map