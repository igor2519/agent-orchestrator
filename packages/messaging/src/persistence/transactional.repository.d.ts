import type { DataSource, EntityManager, EntityTarget, ObjectLiteral, Repository } from 'typeorm';
export declare abstract class TransactionalRepository<TEntity extends ObjectLiteral> {
    protected readonly entity: EntityTarget<TEntity>;
    protected readonly dataSource: DataSource;
    protected constructor(entity: EntityTarget<TEntity>, dataSource: DataSource);
    protected scoped(manager?: EntityManager): Repository<TEntity>;
}
//# sourceMappingURL=transactional.repository.d.ts.map