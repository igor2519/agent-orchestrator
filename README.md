# agent-orchestrator

Event-driven document processing built as choreographed microservices. A customer
system submits a document; it is OCR'd, validated, processed and the result is
delivered back by webhook. **No service tells another what to do** — each reacts to
domain events on a RabbitMQ topic exchange.

## What this is

v1 of an asynchronous document-processing orchestrator, built as choreographed
microservices. This section maps the task's build items onto the code so each can
be found quickly.

| #   | Requirement                                                                 | Where                                                                                                            |
| --- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 1   | Submit a job (customer id, reference, type, payload or reference, callback) | `POST /documents`, [submit-document.dto.ts](apps/api/src/features/documents/dto/submit-document.dto.ts)          |
| 2   | Query a job by id — status, timestamps, result metadata, errors             | `GET /documents/:id`, [document.entity.ts](apps/api/src/features/documents/entities/document.entity.ts)          |
| 3   | List with filtering by customer, status, date                               | `GET /documents`, [list-documents-query.dto.ts](apps/api/src/features/documents/dto/list-documents-query.dto.ts) |
| 4   | Async processor behind a replaceable interface                              | `BaseDocumentProcessor` + registry, [processing.module.ts](apps/processing-service/src/processing.module.ts)     |
| 5   | Notify on completion / permanent failure, attempts visible                  | [notification-service](apps/notification-service/), `delivery_attempts`, mock receiver at `POST /mock/callbacks` |
| 6   | Append-only audit trail                                                     | `audit_events`, `GET /documents/:id/audit` — see [Audit trail](#audit-trail)                                     |
| 7   | Retry/recovery for transient failures                                       | `TransientError`/`PermanentError`, outbox retry, webhook backoff, `POST /documents/:id/retry`                    |
| —   | No duplicate work on client retries                                         | `Idempotency-Key` + content hash — see [Why it is reliable](#why-it-is-reliable)                                 |

## Assumptions

These were not specified by the brief; each is a decision rather than a discovery.

- **One shared API key, not per-customer credentials.** `customerId` is taken from
  the request body and trusted. That is acceptable for v1 and explicitly not
  multi-tenant-safe; see [Known gaps](#known-gaps-for-v1).
- **Payloads are synthetic and small.** They are stored inline as JSONB rather than
  in object storage, since production-grade file storage is out of scope. An
  uploaded file is base64-encoded into the same column.
- **A document is identified by its content, not its name.** Two submissions of the
  same bytes for the same customer are the same work, whatever reference they carry.
- **Processing is deterministic.** The mock OCR and processing implementations
  derive their outcome from a hash of the document reference, so transient and
  permanent failures are reproducible without clocks or randomness.
- **The customer's callback is an untrusted URL.** Loopback and private addresses
  are rejected by default to avoid SSRF.
- **Choreography over orchestration.** No service instructs another; each reacts to
  domain events. The API keeps a read model but never issues commands.

## Services

| Workspace                                               | Surface                           | Database          | Consumes                             | Publishes                                                                    |
| ------------------------------------------------------- | --------------------------------- | ----------------- | ------------------------------------ | ---------------------------------------------------------------------------- |
| [apps/api](apps/api/)                                   | **HTTP** + `api.projection` queue | `boilerplate`     | all outcome events (read model only) | `DocumentSubmitted`                                                          |
| [apps/ocr-service](apps/ocr-service/)                   | queue only                        | `ocr_db`          | `DocumentSubmitted`                  | `DocumentValidated`, `DocumentValidationFailed`                              |
| [apps/processing-service](apps/processing-service/)     | queue only                        | `processing_db`   | `DocumentValidated`                  | `DocumentProcessingStarted`, `DocumentProcessed`, `DocumentProcessingFailed` |
| [apps/notification-service](apps/notification-service/) | queue only                        | `notification_db` | the three terminal outcomes          | `NotificationDelivered`, `NotificationFailed`                                |

**Only the API serves HTTP.** The three workers start as Nest _application contexts_
with no listener — their sole entry point is a RabbitMQ queue. Anything a customer
or operator needs over HTTP is therefore exposed by the API, and reaches it as an
event rather than a cross-service query.

### Event controllers

Each service has one `@MessageController` whose `@OnEvent` methods are its RabbitMQ
endpoints. The dispatcher reads that metadata once at startup and routes each
message to the subscribed methods inside a single transaction.

```ts
@MessageController()
export class ProcessingEventsController {
  @OnEvent(EventType.DocumentValidated)
  async onDocumentValidated({ manager, envelope, logger }: EventContext) { … }
}
```

| Service              | Controller                     | Subscribes to                                                               |
| -------------------- | ------------------------------ | --------------------------------------------------------------------------- |
| api                  | `DocumentEventsController`     | every outcome event (projection only)                                       |
| ocr-service          | `OcrEventsController`          | `DocumentSubmitted`                                                         |
| processing-service   | `ProcessingEventsController`   | `DocumentValidated`                                                         |
| notification-service | `NotificationEventsController` | `DocumentProcessed`, `DocumentProcessingFailed`, `DocumentValidationFailed` |

Shared packages: [@app/contracts](packages/contracts/) (events + topology),
[@app/messaging](packages/messaging/) (AMQP, Inbox/Outbox), [@app/logger](packages/logger/)
(`BaseLogger`).

**Each service owns its database exclusively.** They share one Postgres instance
locally for convenience; no service reads another's schema, so splitting them onto
separate instances is an environment change, not a code change.

The API's database is still called `boilerplate` — leftover naming from the template
this started as, where the others follow `<service>_db`. Renaming it is an env and
migration-bootstrap change, listed in [Known gaps](#known-gaps-for-v1).

## The flow

```
customer ──POST /documents──▶ api ──DocumentSubmitted──▶ ocr-service
                                                              │
                                    ┌──DocumentValidated──────┘
                                    ▼
                          processing-service ──DocumentProcessed──┐
                                                                   ▼
                                                        notification-service
                                                                   │
                                                              webhook ──▶ customer
```

`api` also subscribes, but only to update its own read model. It never publishes an
instruction, which is what keeps this choreography rather than orchestration.

## State machine

```
                 ┌──────────────── retry (operator, FAILED only) ─────────────┐
                 ▼                                                            │
  submit ──▶ RECEIVED ──▶ VALIDATED ──▶ PROCESSING ──▶ COMPLETED              │
                 │            │             │                                 │
                 └────────────┴─────────────┴──▶ FAILED ──────────────────────┘
```

| Transition                 | Caused by                                | Failure reason recorded             |
| -------------------------- | ---------------------------------------- | ----------------------------------- |
| → `RECEIVED`               | `POST /documents` or `/documents/upload` | —                                   |
| `RECEIVED` → `VALIDATED`   | `DocumentValidated` from ocr-service     | —                                   |
| `RECEIVED` → `FAILED`      | `DocumentValidationFailed`               | `VALIDATION`                        |
| `VALIDATED` → `PROCESSING` | `DocumentProcessingStarted`              | —                                   |
| `PROCESSING` → `COMPLETED` | `DocumentProcessed`                      | —                                   |
| `PROCESSING` → `FAILED`    | `DocumentProcessingFailed`               | `PERMANENT` or `ATTEMPTS_EXHAUSTED` |
| `FAILED` → `RECEIVED`      | `POST /documents/:id/retry`              | cleared                             |

`COMPLETED` and `FAILED` are terminal (`isTerminalStatus`). Two behaviours are
deliberately _not_ status transitions:

- **Transient processor failures** do not move the document. The service re-queues
  the work with backoff and the document stays in its current state until attempts
  are exhausted, at which point it becomes `FAILED` with `ATTEMPTS_EXHAUSTED`.
- **Notification outcomes** never change document status. A `COMPLETED` document
  whose webhook could not be delivered is still `COMPLETED`; delivery is tracked
  separately in `notificationStatus` and the audit trail.

Only a `FAILED` document may be retried, and the transition is guarded in SQL
(`UPDATE … WHERE status = 'FAILED'`) so two concurrent retries cannot both start a
run — the second updates zero rows.

## Why it is reliable

**Postgres is the source of truth; RabbitMQ is only transport.**

- **Outbox** — a state change and the events it produces commit in one transaction,
  so an event can never be lost after its cause was recorded. A relay publishes rows
  afterwards with publisher confirms.
- **Inbox** — consumers record processed event ids in the same transaction as the
  work. A redelivered message is recognised and acknowledged without repeating.
- **Acknowledge last** — messages are acked only after the transaction commits. A
  crash in between causes a redelivery the inbox discards.
- **Ordering** — outbox rows carry a `bigserial` sequence, because Postgres `now()`
  is the transaction timestamp and would tie for rows written together.
- **Retries** — a delayed outbox row addressed to a service-private routing key.
  Exponential backoff with full jitter; private keys mean a retry never re-notifies
  unrelated consumers.
- **Error classification** — handlers throw `TransientError` or `PermanentError`.
  Unclassified errors are treated as permanent so a poison message cannot loop.
- **DLQ** — every queue dead-letters to `documents.dlx` with a `<queue>.dlq` key.
- **Idempotent submission** — `Idempotency-Key` plus a unique constraint on
  `(customer_id, key)`. Concurrent duplicates are arbitrated by the constraint, not a
  lock. Reusing a key with a different body is a `409`.
- **Process each file once** — every submission is fingerprinted with a SHA-256 of
  its canonical content (keys sorted recursively, array order preserved). A file
  already processed for that customer returns the original document with
  `deduplicatedBy: CONTENT_HASH`, whatever reference or idempotency key it arrives
  under. Documents that ended in `FAILED` are excluded, so a file that never
  processed successfully is not permanently blocked by its own failure. This is a
  separate check from `Idempotency-Key`: that one makes a retried _HTTP call_ safe,
  this one makes a repeated _file_ safe.
- **Append-only audit trail** — every state change and operational action is
  written to `audit_events` in the same transaction as the change itself, so a
  change cannot commit without its audit line and a line cannot outlive a
  rolled-back change. See below.

## Audit trail

`GET /documents/:id/audit` returns the document's history, oldest first.

Entries are written from exactly two places, which together cover every way a
document can change:

| Where                       | Actions                                                           |
| --------------------------- | ----------------------------------------------------------------- |
| `DocumentsService`          | `DOCUMENT_SUBMITTED`, `DUPLICATE_DETECTED`, `RETRY_REQUESTED`     |
| `DocumentProjectionService` | `STATUS_CHANGED`, `NOTIFICATION_DELIVERED`, `NOTIFICATION_FAILED` |

The projection is the single point where the API reacts to downstream events, so
hooking it there means a new pipeline event is recorded without touching the
audit code.

A real submission produces:

```
seq  action              actor     from        -> to
1    DOCUMENT_SUBMITTED  API       -           -> RECEIVED
2    STATUS_CHANGED      PIPELINE  RECEIVED    -> VALIDATED
3    STATUS_CHANGED      PIPELINE  VALIDATED   -> PROCESSING
4    STATUS_CHANGED      PIPELINE  PROCESSING  -> COMPLETED
```

**Append-only is enforced by the database, not by convention.** A trigger rejects
`UPDATE` and `DELETE` per row, and a second statement-level trigger rejects
`TRUNCATE` — which row triggers never see and which would otherwise erase the whole
trail in one statement:

```
ERROR:  audit_events is append-only; UPDATE is not permitted
```

The honest limit of that guarantee: the services currently connect as the database
owner, and an owner can `ALTER TABLE … DISABLE TRIGGER` before writing. So the trail
is protected against the application's queries, not against the application's
credentials. Closing that means a least-privilege role holding only `INSERT` and
`SELECT` on this table — tracked in [Known gaps](#known-gaps-for-v1).

Ordering is by the `sequence` bigserial rather than `recorded_at`, because rows
written inside one transaction share a timestamp.

Delivery outcomes are recorded as their own actions rather than status changes: a
completed document whose webhook failed is still completed, and flattening both
into `STATUS_CHANGED` would lose that.

## Data model

Each service owns its schema exclusively; nothing reads another's tables.

| Database            | Table                               | Holds                                                                     |
| ------------------- | ----------------------------------- | ------------------------------------------------------------------------- |
| `boilerplate` (api) | `documents`                         | the read model: status, timestamps, results, errors, notification outcome |
|                     | `idempotency_keys`                  | `(customer_id, key)` unique, plus the request fingerprint                 |
|                     | `audit_events`                      | append-only history                                                       |
|                     | `customer_settings`                 | per-customer callback URL and notification mode                           |
|                     | `received_callbacks`                | what the mock receiver was sent, and whether the signature verified       |
| `ocr_db`            | `ocr_results`                       | one row per `(document_id, attempt)`                                      |
| `processing_db`     | `processing_results`                | one row per `(document_id, attempt)`                                      |
| `notification_db`   | `notification_deliveries`           | one delivery per document/attempt/channel/event                           |
|                     | `delivery_attempts`                 | every individual webhook attempt with status code and latency             |
| all four            | `inbox_messages`, `outbox_messages` | the transactional messaging pattern                                       |

Timestamps on `documents` are per-stage (`validatedAt`, `processingStartedAt`,
`completedAt`, `failedAt`) rather than a single `updatedAt`, so the duration of each
stage is recoverable after the fact.

## Extending it

Add a class and list it in one array — no handler, event or queue changes:

| Extension          | Base class              | Register in                                                                                              |
| ------------------ | ----------------------- | -------------------------------------------------------------------------------------------------------- |
| OCR engine         | `BaseOcrProcessor`      | `OCR_PROCESSOR_CLASSES` in [ocr.module.ts](apps/ocr-service/src/ocr.module.ts)                           |
| Validation rule    | `BaseDocumentValidator` | `DOCUMENT_VALIDATOR_CLASSES` in the same file                                                            |
| Document processor | `BaseDocumentProcessor` | `DOCUMENT_PROCESSOR_CLASSES` in [processing.module.ts](apps/processing-service/src/processing.module.ts) |
| Log transport      | `BaseLogger`            | [logger.module.ts](packages/logger/src/logger.module.ts)                                                 |

Registration order is precedence, so a type-specific implementation goes before a
catch-all. Business code depends on `BaseLogger`, never on `console`.

## Running locally

```sh
yarn install
yarn setup:env         # one .env per service from example.env
yarn docker:local      # postgres (4 databases) + rabbitmq + mailhog
yarn build
yarn migration:run     # each service migrates its own database
```

Then start the four services (`yarn dev` in each app, or `yarn dev` at the root).
Only the API opens a port; the workers log `… ready, consuming <queue>` and wait.

Submit a document:

```sh
curl -X POST http://localhost:3001/documents \
  -H 'content-type: application/json' \
  -H 'x-api-key: <API_KEY>' \
  -H 'Idempotency-Key: demo-1' \
  -d '{"customerId":"customer-alpha","documentReference":"INV-1",
       "documentType":"invoice","payload":{"amount":100,"currency":"EUR"},
       "callbackUrl":"http://localhost:3013/mock/callbacks"}'
```

All HTTP lives on the API service:

| Endpoint                                                            | Purpose                                                      |
| ------------------------------------------------------------------- | ------------------------------------------------------------ |
| `POST /documents`                                                   | submit (requires `Idempotency-Key`)                          |
| `GET /documents/:id`                                                | status, results, errors, and the full webhook attempt log    |
| `GET /documents/:id/audit`                                          | append-only history of state changes and operational actions |
| `GET /documents?status=&customerId=&submittedFrom=`                 | search                                                       |
| `POST /documents/:id/retry`                                         | re-run a failed document                                     |
| `GET /messaging/outbox/stats`, `/outbox/pending`, `/inbox/:eventId` | operational view of the API's own inbox/outbox               |
| `GET /documents/stream`                                             | server-sent events mirroring the webhooks (see below)        |
| `POST /mock/callbacks`                                              | mock customer receiver; verifies the HMAC signature          |

Webhook attempts are visible through `GET /documents/:id` rather than a notification
service endpoint: the notification service owns its own database and serves no HTTP,
so the attempt log travels to the API on the `NotificationDelivered` /
`NotificationFailed` event.

Callbacks to private or loopback addresses are rejected by default (SSRF); set
`ALLOW_PRIVATE_CALLBACK_URLS=true` locally to reach the mock receiver.

## Notification channels

Every channel extends `BaseNotificationProvider`, so intake, retry scheduling,
attempt logging and terminal handling are written once:

Channels are strategies in `providers/`; `services/` runs them.

| `providers/`               | Channel     | Delivers by                                       |
| -------------------------- | ----------- | ------------------------------------------------- |
| `BaseNotificationProvider` | —           | the contract: `supports()` and `deliver()`        |
| `WebhookProvider`          | `WEBHOOK`   | signed HTTP POST to the customer's callback       |
| `WebsocketProvider`        | `WEBSOCKET` | publishing a broadcast the API relays to browsers |

| `services/`                   | Responsibility                                                            |
| ----------------------------- | ------------------------------------------------------------------------- |
| `NotificationIntakeService`   | outcome event → one delivery row per applicable channel                   |
| `NotificationDeliveryService` | picks the strategy for a delivery's channel and owns the shared lifecycle |
| `DeliveryScheduler`           | decides _when_ due deliveries are attempted                               |

A provider knows only how to put a payload on its transport. Attempt logging, retry
backoff, terminal status and the outcome event are written once in
`NotificationDeliveryService`, which is why adding email or Slack is a subclass plus
one entry in `NOTIFICATION_PROVIDER_CLASSES`.

Intake creates **one delivery row per channel**, each with its own attempts and
schedule — a failing webhook cannot hold up the websocket broadcast.

## Watching a document from a browser

A browser cannot receive a webhook, so the websocket channel bridges it: the
notification service publishes a broadcast, and the API — the only service with a
listener — relays it to connected sockets.

```
notification-service ──signed webhook────────────▶ customer endpoint
notification-service ──NotificationBroadcast──▶ api ──WebSocket──▶ browser
```

`WebSocket` cannot send headers on the handshake, so connections are authorised by a
**short-lived signed ticket** rather than the API key: the Next route handler
exchanges its server-side key for a ticket that expires in a minute, and the browser
presents only that. The expiry is inside the signed material, so it cannot be
extended. `/documents` in the frontend submits a document and watches milestones
arrive live.

Broadcasts are published from a **post-commit hook**, so nothing is announced for a
transaction that rolled back. `GET /documents/stream` (SSE) remains for CLI use.

## The upload flow

```
FE upload ──▶ API                       validate format (Joi: pdf/txt/doc/docx, 10MB)
                │                       hash the bytes
                ├── hash seen? ──yes──▶ DocumentDuplicateDetected ──▶ notify, don't reprocess
                └── no ──▶ DocumentSubmitted
                              ▼
                            OCR      extract text (txt / pdf / docx / image)
                              │      validate: non-empty, confident, no HTML
                              ▼
                        Processing   prefix every line with ++
                              ▼
                       Notification  WebSocket always, webhook when configured
                                     payload carries a link to the result file
```

Settings live under **Webhook settings** in the UI (`PUT /customers/:id/settings`).
WebSocket is the default and always on, so a customer who configures nothing still
sees progress; a webhook URL is required before `WEBHOOK` or `BOTH` can be selected,
enforced in the schema rather than only in the form.

A duplicate still produces a notification. Silently returning the old document
would leave a submission that never produced a callback, so
`DocumentDuplicateDetected` drives the same channels with
`status: ALREADY_PROCESSED` and a link to the existing result.

The processed text travels on `DocumentProcessed` and the API serves it from
`GET /documents/:id/result` as a download. That keeps database-per-service intact -
no service reads another's storage - and is sized for text output; binary results
would move to object storage with a reference on the event instead.

## OCR engines

| Engine                      | Claims             | Notes                                                                                  |
| --------------------------- | ------------------ | -------------------------------------------------------------------------------------- |
| `PlainTextProcessor`        | `text`             | Reads the bytes; no recognition needed, so confidence is 1                             |
| `PdfTextProcessor`          | `pdf`              | Extracts the text layer; a PDF without one is a scan and fails permanently             |
| `WordTextProcessor`         | `word`             | `.docx` via mammoth's raw text - not its HTML output, which the HTML rule would reject |
| `TesseractOcrProcessor`     | `image`, `scan`, … | Real OCR, for content that genuinely needs recognition                                 |
| `DeterministicOcrProcessor` | everything else    | Reproducible stand-in                                                                  |

Order is precedence. Each format goes to the engine that reads it exactly, and
Tesseract handles only what actually requires recognition. The Tesseract worker is expensive to start (it downloads language data
on first use), so one is created lazily, reused, and terminated on shutdown; a
recognition crash disposes it so the next attempt gets a fresh one. Failures are
classified deliberately — a missing or corrupt image is permanent, a worker or fetch
problem is transient.

## Request tracing

Every HTTP request gets an `x-request-id` (an inbound one is honoured after
sanitising, otherwise generated) which is echoed on the response, carried in
`AsyncLocalStorage` for the life of the request, written into every outbox row and
event envelope, and re-established by the dispatcher before handlers run.

One request id therefore appears in the logs of all four services for the work it
caused. It is distinct from `correlationId`: correlation groups everything about one
document including operator retries months later, while the request id pins work to
the single inbound call — which is what an operator has when a customer quotes a
failed request.

## Deterministic mocks

The deterministic OCR and processing mocks derive their behaviour — including whether
they fail, and whether that failure is transient or permanent — from a hash of the
document reference. Every retry and failure path is therefore reproducible from a
fixed input, with no clocks or randomness. See the class comments for the bucket
ranges.

## Deployment

Two paths exist in the repository. **Neither is currently deployed to a public
URL** — the live-service deliverable is outstanding.

| Path                                                                    | What it provisions                                                                       | State                                                                              |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [packages/infrastructure/terraform](packages/infrastructure/terraform/) | VPC, ECS Fargate for all five services, RDS Postgres, Amazon MQ, S3, ALB + ACM + Route53 | `terraform validate` passes; never applied. Requires a real domain and hosted zone |
| [deploy.sh](deploy.sh) + [ecosystem.config.js](ecosystem.config.js)     | Single VM: git pull, build, migrate, PM2 reload, release retention                       | Runs; exercised against a stubbed environment, not a real host                     |

### Backing services on the VM

The single-VM path runs Postgres and RabbitMQ in Docker on the host, with the app
processes under PM2 alongside them:

```sh
yarn --cwd packages/infrastructure docker:prod    # postgres + rabbitmq
yarn migration:run
pm2 startOrReload ecosystem.config.js --env production
```

[docker-compose.prod.yml](packages/infrastructure/docker-compose.prod.yml) differs
from the local one where it matters: every port is published on `127.0.0.1` only,
credentials have no defaults so an unset one fails the deploy, data lives in named
volumes, and both containers get restart policies, log rotation and memory limits.
There is no mailhog — production mail goes through Brevo.

Binding to loopback is the important part. A plain `5432:5432` binds `0.0.0.0`, and
Docker inserts its own iptables rules ahead of ufw, so the database would be
reachable from the internet even behind a firewall that looks like it denies it.
Reach the RabbitMQ management UI over an SSH tunnel instead:

```sh
ssh -L 15672:127.0.0.1:15672 user@server
```

Not covered: backups. A `pg_dump` cron writing off-box is the minimum before this
holds real data.

The container path is the intended one: Dockerfiles exist for all five services and
use `turbo prune` so each image contains only that service and its dependencies.

```sh
# containers (build context is the repo root)
docker build -f apps/api/Dockerfile -t <repo>:<sha> .

# infrastructure
cd packages/infrastructure/terraform
terraform init -backend-config=environments/dev.backend.hcl
terraform apply -var-file=environments/dev.tfvars
terraform output -raw db_bootstrap_command | bash   # creates the three worker databases
```

Secrets are generated by Terraform into Secrets Manager and injected by the ECS
agent, so they appear in no image and no task definition. They _do_ appear in
Terraform state — the state bucket must stay private and encrypted.

## Production readiness

What is deliberately in place, and what it costs.

| Concern                 | Decision                                                                                                                                     |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Delivery guarantees** | Transactional outbox + inbox, ack-after-commit. At-least-once with idempotent consumers, rather than a distributed transaction               |
| **Failure isolation**   | Each service owns its database; a worker cannot read or corrupt another's schema                                                             |
| **Poison messages**     | Unclassified errors are treated as permanent, so a bad message fails fast to the DLQ instead of looping                                      |
| **Backpressure**        | `RABBITMQ_PREFETCH` bounds in-flight work per consumer                                                                                       |
| **Blast radius**        | Only the API is internet-facing; the three workers take no inbound traffic at all, and only the API's task role can reach the uploads bucket |
| **SSRF**                | Customer callbacks to loopback/private ranges are rejected unless explicitly enabled                                                         |
| **Observability**       | Structured JSON logs with correlation and causation ids; `GET /messaging/outbox/stats` and `/inbox/:eventId` for operational inspection      |
| **Testing**             | 110 unit tests across five packages, covering validators, processors, retry classification, idempotency hashing and the audit service        |

## Trade-offs

- **Choreography over orchestration.** Adding a stage means adding a subscriber,
  not editing a coordinator. The cost is that no single file describes the whole
  flow — the state machine above exists to compensate.
- **A read model in the API.** `documents` duplicates state the workers already
  hold, which is denormalisation. It buys a single queryable surface without
  cross-service joins or synchronous fan-out.
- **Postgres as the queue's source of truth.** The outbox adds a write and a relay
  hop. It removes the dual-write problem entirely, which is the failure mode that
  actually loses work.
- **JSONB payloads.** Simple and transactional, but every read drags the full
  document through Postgres and base64 inflates it ~33%. Object storage is the
  answer at real sizes; the S3 bucket and IAM policy already exist in Terraform.
- **Deterministic mocks over real OCR.** Reproducible tests and no provider
  dependency, at the cost of never exercising a real engine's failure modes. A
  Tesseract processor is registered alongside the mock to keep that path honest.

## AI usage log

| Step          | Tool        | What I asked AI to do                                              | What I kept                                                                      | What I changed/rejected                                                                                                                           | Why                                                                                                                 |
| ------------- | ----------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Audit trail   | Claude Code | Design and implement the append-only trail, migration and endpoint | Table, dual write-points, DB triggers, `GET /:id/audit`, tests                   | Rejected the initial unnamed indexes (drifted on every `migration:generate`); added a `TRUNCATE` trigger after finding row triggers do not see it | Trail is worthless if it can be silently altered or if migrations never converge                                    |
| Migrations    | Claude Code | Audit existing migrations, remove dead ones                        | Deleting two boilerplate migrations; adding the missing `uuid-ossp` extension    | —                                                                                                                                                 | Three services would have failed on a fresh database: they used `uuid_generate_v4()` without creating the extension |
| Terraform     | Claude Code | Write the ECS/Fargate infrastructure                               | VPC, ECS, RDS, MQ, ALB, IAM, secrets                                             | Rejected `^build` on the base `dev` task; scoped it per service                                                                                   | The generic version raced `rimraf dist` against a running watcher                                                   |
| Deploy script | Claude Code | Review and fix `deploy.sh`                                         | Path derivation, preflight checks, `pm2 startOrReload`, all five services in PM2 | Rejected my own first cleanup rewrite after testing showed it deleted the _live_ release                                                          | `ls -dt release-*/` also matched the `release-current` symlink                                                      |
| Frontend      | Claude Code | Add a documents list page and improve the design                   | Page, filters, pagination, base CSS layer                                        | Replaced daisyUI `btn` classes with explicit utilities                                                                                            | daisyUI is configured `exclude: base`, so `btn` rendered as bare text                                               |
| Documentation | Claude Code | Draft this README against the task brief                           | Structure, requirement map, state machine, data model                            | —                                                                                                                                                 | —                                                                                                                   |

**Parts written without AI:** _[to complete — the original service architecture,
event contracts, messaging package and processors predate the AI-assisted work
above.]_

**How I verified AI output:** every change was checked by running it, not by
reading it. Migrations were applied to a throwaway database and `migration:generate`
re-run to prove zero drift; the audit trail was verified end-to-end against the
running pipeline and its append-only guarantee tested by attempting `UPDATE`,
`DELETE` and `TRUNCATE`; the deploy script was exercised in a sandbox with stubbed
`yarn`/`pm2`, which caught two bugs in the AI-written version; Terraform was checked
with `terraform validate` and `fmt`. The full suite (110 tests, typecheck, lint) was
run after each change.

## Known gaps for v1

- The API key is a single shared secret ([auth.service.ts](apps/api/src/features/auth/services/auth.service.ts)),
  so `customerId` is taken from the request body. Per-customer keys are needed before
  this is multi-tenant.
- No metrics or tracing exporter yet; logs are structured JSON with correlation and
  causation ids.
- Payloads are stored inline as JSONB with no size cap.
- The audit trail records `correlation_id` but not `request_id`, and stores
  `recorded_at` (when the row was written) but not the event's `occurred_at`. Both
  are available on the event envelope.
- Append-only is enforced by trigger rather than by revoking `UPDATE`/`DELETE` from
  a least-privilege role, so the owning database user can disable the guard.
- No live deployed service yet; both deployment paths are built but unapplied.
- Env templates are named `example.env`, not `.env.example`.
- The API's database is named `boilerplate` rather than `api_db`, unlike the other three.
