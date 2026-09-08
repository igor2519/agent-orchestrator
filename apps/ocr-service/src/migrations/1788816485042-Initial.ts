import { MigrationInterface, QueryRunner } from 'typeorm';

export class Initial1788816485042 implements MigrationInterface {
  name = 'Initial1788816485042';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "inbox_messages" ("event_id" uuid NOT NULL, "consumer" character varying(128) NOT NULL, "type" character varying(64) NOT NULL, "processed_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_e22cabc99c47a28c4c2dbe12bfd" PRIMARY KEY ("event_id", "consumer"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bd458a235b667ce208396a8436" ON "inbox_messages"  ("processed_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "outbox_messages" ("id" uuid NOT NULL, "document_id" uuid NOT NULL, "type" character varying(64) NOT NULL, "routing_key" character varying(128) NOT NULL, "envelope" jsonb NOT NULL, "correlation_id" uuid NOT NULL, "causation_id" uuid, "sequence" BIGSERIAL NOT NULL, "available_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "published_at" TIMESTAMP WITH TIME ZONE, "attempts" integer NOT NULL DEFAULT '0', "last_error" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_0171348f527c64b137e4d4f5b66" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d42136e54f748d65fd8324da31" ON "outbox_messages"  ("published_at", "available_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "ocr_results" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "document_id" uuid NOT NULL, "correlation_id" uuid NOT NULL, "document_reference" character varying NOT NULL, "document_type" character varying NOT NULL, "attempt" integer NOT NULL, "outcome" character varying(32) NOT NULL, "ocr" jsonb, "issues" jsonb NOT NULL DEFAULT '[]'::jsonb, "validators_executed" jsonb NOT NULL DEFAULT '[]'::jsonb, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "uq_ocr_document_attempt" UNIQUE ("document_id", "attempt"), CONSTRAINT "PK_562c4e52268d72e5b1a6833beb5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cb80ce9d2b258f7d7a35aec1f8" ON "ocr_results"  ("document_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3a07b225bc9bd9269a0494dcd2" ON "ocr_results"  ("correlation_id") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_3a07b225bc9bd9269a0494dcd2"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_cb80ce9d2b258f7d7a35aec1f8"`);
    await queryRunner.query(`DROP TABLE "ocr_results"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_d42136e54f748d65fd8324da31"`);
    await queryRunner.query(`DROP TABLE "outbox_messages"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_bd458a235b667ce208396a8436"`);
    await queryRunner.query(`DROP TABLE "inbox_messages"`);
  }
}
