# agent-orchestrator

Event-driven document processing built as choreographed microservices. A customer
system submits a document; it is OCR'd, validated, processed and the result is
delivered back by webhook. **No service tells another what to do** — each reacts to
domain events on a RabbitMQ topic exchange.

## Services

| Workspace | Surface | Database | Consumes | Publishes |
|---|---|---|---|---|
| [apps/api](apps/api/) | **HTTP** + `api.projection` queue | `api_db` | all outcome events (read model only) | `DocumentSubmitted` |
| [apps/ocr-service](apps/ocr-service/) | queue only | `ocr_db` | `DocumentSubmitted` | `DocumentValidated`, `DocumentValidationFailed` |
| [apps/processing-service](apps/processing-service/) | queue only | `processing_db` | `DocumentValidated` | `DocumentProcessingStarted`, `DocumentProcessed`, `DocumentProcessingFailed` |
| [apps/notification-service](apps/notification-service/) | queue only | `notification_db` | the three terminal outcomes | `NotificationDelivered`, `NotificationFailed` |

**Only the API serves HTTP.** The three workers start as Nest *application contexts*
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

| Service | Controller | Subscribes to |
|---|---|---|
| api | `DocumentEventsController` | every outcome event (projection only) |
| ocr-service | `OcrEventsController` | `DocumentSubmitted` |
| processing-service | `ProcessingEventsController` | `DocumentValidated` |
| notification-service | `NotificationEventsController` | `DocumentProcessed`, `DocumentProcessingFailed`, `DocumentValidationFailed` |

Shared packages: [@app/contracts](packages/contracts/) (events + topology),
[@app/messaging](packages/messaging/) (AMQP, Inbox/Outbox), [@app/logger](packages/logger/)
(`BaseLogger`).

**Each service owns its database exclusively.** They share one Postgres instance
locally for convenience; no service reads another's schema, so splitting them onto
separate instances is an environment change, not a code change.

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
  separate check from `Idempotency-Key`: that one makes a retried *HTTP call* safe,
  this one makes a repeated *file* safe.

## Extending it

Add a class and list it in one array — no handler, event or queue changes:

| Extension | Base class | Register in |
|---|---|---|
| OCR engine | `BaseOcrProcessor` | `OCR_PROCESSOR_CLASSES` in [ocr.module.ts](apps/ocr-service/src/ocr.module.ts) |
| Validation rule | `BaseDocumentValidator` | `DOCUMENT_VALIDATOR_CLASSES` in the same file |
| Document processor | `BaseDocumentProcessor` | `DOCUMENT_PROCESSOR_CLASSES` in [processing.module.ts](apps/processing-service/src/processing.module.ts) |
| Log transport | `BaseLogger` | [logger.module.ts](packages/logger/src/logger.module.ts) |

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

| Endpoint | Purpose |
|---|---|
| `POST /documents` | submit (requires `Idempotency-Key`) |
| `GET /documents/:id` | status, results, errors, and the full webhook attempt log |
| `GET /documents?status=&customerId=&submittedFrom=` | search |
| `POST /documents/:id/retry` | re-run a failed document |
| `GET /messaging/outbox/stats`, `/outbox/pending`, `/inbox/:eventId` | operational view of the API's own inbox/outbox |
| `GET /documents/stream` | server-sent events mirroring the webhooks (see below) |
| `POST /mock/callbacks` | mock customer receiver; verifies the HMAC signature |

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

| `providers/` | Channel | Delivers by |
|---|---|---|
| `BaseNotificationProvider` | — | the contract: `supports()` and `deliver()` |
| `WebhookProvider` | `WEBHOOK` | signed HTTP POST to the customer's callback |
| `WebsocketProvider` | `WEBSOCKET` | publishing a broadcast the API relays to browsers |

| `services/` | Responsibility |
|---|---|
| `NotificationIntakeService` | outcome event → one delivery row per applicable channel |
| `NotificationDeliveryService` | picks the strategy for a delivery's channel and owns the shared lifecycle |
| `DeliveryScheduler` | decides *when* due deliveries are attempted |

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

## OCR engines

| Engine | Claims | Notes |
|---|---|---|
| `TesseractOcrProcessor` | `image`, `scan`, `scanned-document`, `receipt-image` | Real OCR via Tesseract.js; reads `payload.imageBase64` or fetches `payloadUri` |
| `DeterministicOcrProcessor` | everything else | Reproducible stand-in |

Order is precedence, so Tesseract takes image types and the deterministic engine is
the fallback. The Tesseract worker is expensive to start (it downloads language data
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

## Known gaps for v1

- The API key is a single shared secret ([auth.service.ts](apps/api/src/features/auth/services/auth.service.ts)),
  so `customerId` is taken from the request body. Per-customer keys are needed before
  this is multi-tenant.
- No metrics or tracing exporter yet; logs are structured JSON with correlation and
  causation ids.
- Payloads are stored inline as JSONB with no size cap.
