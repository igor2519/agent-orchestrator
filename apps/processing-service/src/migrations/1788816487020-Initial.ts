import { MigrationInterface, QueryRunner } from 'typeorm';

export class Initial1788816487020 implements MigrationInterface {
  name = 'Initial1788816487020';

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
      `CREATE TABLE "processing_results" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "document_id" uuid NOT NULL, "correlation_id" uuid NOT NULL, "document_reference" character varying NOT NULL, "document_type" character varying NOT NULL, "attempt" integer NOT NULL, "outcome" character varying(32) NOT NULL, "processor" character varying(128) NOT NULL, "result" jsonb, "error_code" character varying, "error_message" text, "permanent" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "uq_processing_document_attempt" UNIQUE ("document_id", "attempt"), CONSTRAINT "PK_8feacafee4607a786d4fec8646b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f054d12788975d3d4df0beb959" ON "processing_results"  ("document_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6da9ed8fb0f3aef210f9c5b4ab" ON "processing_results"  ("correlation_id") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_6da9ed8fb0f3aef210f9c5b4ab"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_f054d12788975d3d4df0beb959"`);
    await queryRunner.query(`DROP TABLE "processing_results"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_d42136e54f748d65fd8324da31"`);
    await queryRunner.query(`DROP TABLE "outbox_messages"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_bd458a235b667ce208396a8436"`);
    await queryRunner.query(`DROP TABLE "inbox_messages"`);
  }
}
