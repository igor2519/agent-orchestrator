import { MigrationInterface, QueryRunner } from 'typeorm';

export class AuditTrail1788950000000 implements MigrationInterface {
  name = 'AuditTrail1788950000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "audit_events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "sequence" BIGSERIAL NOT NULL, "document_id" uuid NOT NULL, "customer_id" character varying NOT NULL, "correlation_id" uuid NOT NULL, "action" character varying(64) NOT NULL, "actor" character varying(32) NOT NULL, "from_status" character varying(32), "to_status" character varying(32), "event_type" character varying(64), "event_id" uuid, "attempt" integer, "detail" jsonb, "recorded_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_audit_events" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_events_document_sequence" ON "audit_events" ("document_id", "sequence")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_events_customer_recorded" ON "audit_events" ("customer_id", "recorded_at")`,
    );

    // Append-only is a property of the data, not a convention the application
    // promises to keep. Enforcing it here means a stray UPDATE or DELETE - from a
    // future bug, a migration, or someone at a psql prompt - fails loudly instead
    // of quietly rewriting history.
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION audit_events_append_only() RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'audit_events is append-only; % is not permitted', TG_OP
          USING ERRCODE = 'restrict_violation';
      END;
      $$ LANGUAGE plpgsql;
    `);
    await queryRunner.query(`
      CREATE TRIGGER audit_events_no_update_delete
      BEFORE UPDATE OR DELETE ON "audit_events"
      FOR EACH ROW EXECUTE FUNCTION audit_events_append_only();
    `);

    // Row-level triggers never see TRUNCATE, so without this a single statement
    // could still empty the whole trail.
    await queryRunner.query(`
      CREATE TRIGGER audit_events_no_truncate
      BEFORE TRUNCATE ON "audit_events"
      FOR EACH STATEMENT EXECUTE FUNCTION audit_events_append_only();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS audit_events_no_truncate ON "audit_events"`);
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS audit_events_no_update_delete ON "audit_events"`,
    );
    await queryRunner.query(`DROP FUNCTION IF EXISTS audit_events_append_only()`);
    await queryRunner.query(`DROP INDEX "public"."IDX_audit_events_customer_recorded"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_audit_events_document_sequence"`);
    await queryRunner.query(`DROP TABLE "audit_events"`);
  }
}
