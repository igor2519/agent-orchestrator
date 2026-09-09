"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var MessagingModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const inbox_message_entity_1 = require("./inbox/inbox-message.entity");
const inbox_repository_1 = require("./inbox/inbox.repository");
const inbox_service_1 = require("./inbox/inbox.service");
const messaging_ops_service_1 = require("./messaging-ops.service");
const messaging_bootstrap_1 = require("./messaging.bootstrap");
const messaging_tokens_1 = require("./messaging.tokens");
const outbox_message_entity_1 = require("./outbox/outbox-message.entity");
const outbox_relay_service_1 = require("./outbox/outbox-relay.service");
const outbox_repository_1 = require("./outbox/outbox.repository");
const outbox_service_1 = require("./outbox/outbox.service");
const amqp_connection_1 = require("./rabbitmq/amqp-connection");
const event_dispatcher_service_1 = require("./rabbitmq/event-dispatcher.service");
let MessagingModule = MessagingModule_1 = class MessagingModule {
    static forRoot(options) {
        var _a, _b;
        const controllers = (_a = options.controllers) !== null && _a !== void 0 ? _a : [];
        return {
            module: MessagingModule_1,
            global: true,
            imports: [
                typeorm_1.TypeOrmModule.forFeature([outbox_message_entity_1.OutboxMessage, inbox_message_entity_1.InboxMessage]),
                ...((_b = options.imports) !== null && _b !== void 0 ? _b : []),
            ],
            providers: [
                { provide: messaging_tokens_1.MESSAGING_OPTIONS, useValue: MessagingModule_1.toOptions(options) },
                ...controllers,
                {
                    provide: messaging_tokens_1.EVENT_CONTROLLERS,
                    useFactory: (...resolved) => resolved,
                    inject: controllers,
                },
                amqp_connection_1.AmqpConnection,
                inbox_repository_1.InboxRepository,
                outbox_repository_1.OutboxRepository,
                inbox_service_1.InboxService,
                outbox_service_1.OutboxService,
                messaging_ops_service_1.MessagingOpsService,
                outbox_relay_service_1.OutboxRelayService,
                event_dispatcher_service_1.EventDispatcherService,
                messaging_bootstrap_1.MessagingBootstrap,
            ],
            exports: [
                outbox_service_1.OutboxService,
                outbox_repository_1.OutboxRepository,
                inbox_service_1.InboxService,
                inbox_repository_1.InboxRepository,
                outbox_relay_service_1.OutboxRelayService,
                messaging_ops_service_1.MessagingOpsService,
                amqp_connection_1.AmqpConnection,
                messaging_tokens_1.MESSAGING_OPTIONS,
            ],
        };
    }
    static toOptions(options) {
        return {
            url: options.url,
            queue: options.queue,
            prefetch: options.prefetch,
            relayIntervalMs: options.relayIntervalMs,
            relayBatchSize: options.relayBatchSize,
            relayMaxAttempts: options.relayMaxAttempts,
        };
    }
};
exports.MessagingModule = MessagingModule;
exports.MessagingModule = MessagingModule = MessagingModule_1 = __decorate([
    (0, common_1.Module)({})
], MessagingModule);
//# sourceMappingURL=messaging.module.js.map