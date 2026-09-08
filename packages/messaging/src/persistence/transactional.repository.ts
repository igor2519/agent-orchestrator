import type { DataSource, EntityManager, EntityTarget, ObjectLiteral, Repository } from 'typeorm';

/**
 * Base for repositories that must be able to join a caller's transaction.
 *
 * Event handling opens one transaction per message and passes its
 * {@link EntityManager} down, because the business write, the outbox row and the
 * inbox record have to commit together. A repository bound to the DataSource would
 * quietly write outside that transaction, so every method takes an optional manager
 * and resolves the right one through {@link scoped}.
 *
 * Omitting the manager is correct for reads and for writes that are genuinely
 * standalone.
 */
export abstract class TransactionalRepository<TEntity extends ObjectLiteral> {
  protected constructor(
    protected readonly entity: EntityTarget<TEntity>,
    protected readonly dataSource: DataSource,
  ) {}

  /** The repository bound to the caller's transaction, or to the default manager. */
  protected scoped(manager?: EntityManager): Repository<TEntity> {
    return (manager ?? this.dataSource.manager).getRepository(this.entity);
  }
}
