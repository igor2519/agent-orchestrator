import { MigrationInterface, QueryRunner } from 'typeorm';

export class Initial1788893525889 implements MigrationInterface {
  name = 'Initial1788893525889';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "inbox_messages" ("event_id" uuid NOT NULL, "consumer" character varying(128) NOT NULL, "type" character varying(64) NOT NULL, "processed_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_e22cabc99c47a28c4c2dbe12bfd" PRIMARY KEY ("event_id", "consumer"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bd458a235b667ce208396a8436" ON "inbox_messages"  ("processed_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "outbox_messages" ("id" uuid NOT NULL, "document_id" uuid NOT NULL, "type" character varying(64) NOT NULL, "routing_key" character varying(128) NOT NULL, "envelope" jsonb NOT NULL, "correlation_id" uuid NOT NULL, "causation_id" uuid, "request_id" character varying(64), "sequence" BIGSERIAL NOT NULL, "available_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "published_at" TIMESTAMP WITH TIME ZONE, "attempts" integer NOT NULL DEFAULT '0', "last_error" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_0171348f527c64b137e4d4f5b66" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d42136e54f748d65fd8324da31" ON "outbox_messages"  ("published_at", "available_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "notification_deliveries" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "document_id" uuid NOT NULL, "correlation_id" uuid NOT NULL, "document_attempt" integer NOT NULL, "channel" character varying(16) NOT NULL DEFAULT 'WEBHOOK', "callback_url" character varying, "event_type" character varying(64) NOT NULL, "payload" jsonb NOT NULL, "status" character varying(32) NOT NULL DEFAULT 'PENDING', "attempts" integer NOT NULL DEFAULT '0', "next_attempt_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "last_status_code" integer, "last_error" text, "delivered_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "uq_delivery_document_attempt_channel" UNIQUE ("document_id", "document_attempt", "channel"), CONSTRAINT "PK_81daeff81f237bd384f7cfc4a4c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_659ef2edd26e3715381b1c55d8" ON "notification_deliveries"  ("document_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0aeeb551bb72c6c9e46b007b3c" ON "notification_deliveries"  ("status", "next_attempt_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "delivery_attempts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "delivery_id" uuid NOT NULL, "attempt_number" integer NOT NULL, "status_code" integer, "latency_ms" integer NOT NULL, "succeeded" boolean NOT NULL, "error" text, "response_snippet" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_41eba4eb5401d72860f7cd9a7ac" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4084d3cde31b14a10da92157af" ON "delivery_attempts"  ("delivery_id", "attempt_number") `,
    );
    await queryRunner.query(
      `ALTER TABLE "delivery_attempts" ADD CONSTRAINT "FK_a9d7e7212c87084249a641ab455" FOREIGN KEY ("delivery_id") REFERENCES "notification_deliveries"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "delivery_attempts" DROP CONSTRAINT "FK_a9d7e7212c87084249a641ab455"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_4084d3cde31b14a10da92157af"`);
    await queryRunner.query(`DROP TABLE "delivery_attempts"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_0aeeb551bb72c6c9e46b007b3c"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_659ef2edd26e3715381b1c55d8"`);
    await queryRunner.query(`DROP TABLE "notification_deliveries"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_d42136e54f748d65fd8324da31"`);
    await queryRunner.query(`DROP TABLE "outbox_messages"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_bd458a235b667ce208396a8436"`);
    await queryRunner.query(`DROP TABLE "inbox_messages"`);
  }
}
