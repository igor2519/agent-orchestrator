import { MigrationInterface, QueryRunner } from 'typeorm';

export class DocumentProcessing1788816482563 implements MigrationInterface {
  name = 'DocumentProcessing1788816482563';

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
      `CREATE TABLE "received_callbacks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "document_id" uuid, "correlation_id" uuid, "event_type" character varying, "signature_valid" boolean NOT NULL, "body" jsonb NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_252eb9ecdfec26ec84eb9c31193" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6bb2ff3f7ca7185ba92b85accd" ON "received_callbacks"  ("document_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "documents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "customer_id" character varying NOT NULL, "document_reference" character varying NOT NULL, "document_type" character varying NOT NULL, "payload" jsonb, "payload_uri" character varying, "callback_url" character varying NOT NULL, "status" character varying(32) NOT NULL DEFAULT 'RECEIVED', "failure_reason" character varying(32), "correlation_id" uuid NOT NULL, "attempts" integer NOT NULL DEFAULT '0', "ocr_result" jsonb, "processing_result" jsonb, "error_code" character varying, "error_message" text, "notification_status" character varying(32), "notification_attempts" integer NOT NULL DEFAULT '0', "notification_attempt_log" jsonb, "validated_at" TIMESTAMP WITH TIME ZONE, "processing_started_at" TIMESTAMP WITH TIME ZONE, "completed_at" TIMESTAMP WITH TIME ZONE, "failed_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_ac51aa5181ee2036f5ca482857c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_390b85354b70567464f6f9f436" ON "documents"  ("customer_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cd57d0a46c6818abae5f160c9e" ON "documents"  ("correlation_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fe5d4bb7999d3d547eb2334591" ON "documents"  ("customer_id", "status", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "idempotency_keys" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "customer_id" character varying NOT NULL, "key" character varying(255) NOT NULL, "request_fingerprint" character varying(64) NOT NULL, "document_id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "uq_idempotency_customer_key" UNIQUE ("customer_id", "key"), CONSTRAINT "PK_8ad20779ad0411107a56e53d0f6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5e72f040fdc5efc8eef52a388c" ON "idempotency_keys"  ("created_at") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_5e72f040fdc5efc8eef52a388c"`);
    await queryRunner.query(`DROP TABLE "idempotency_keys"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_fe5d4bb7999d3d547eb2334591"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_cd57d0a46c6818abae5f160c9e"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_390b85354b70567464f6f9f436"`);
    await queryRunner.query(`DROP TABLE "documents"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_6bb2ff3f7ca7185ba92b85accd"`);
    await queryRunner.query(`DROP TABLE "received_callbacks"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_d42136e54f748d65fd8324da31"`);
    await queryRunner.query(`DROP TABLE "outbox_messages"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_bd458a235b667ce208396a8436"`);
    await queryRunner.query(`DROP TABLE "inbox_messages"`);
  }
}
