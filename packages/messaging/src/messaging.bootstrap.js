"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingBootstrap = void 0;
const logger_1 = require("@app/logger");
const common_1 = require("@nestjs/common");
const outbox_relay_service_1 = require("./outbox/outbox-relay.service");
const amqp_connection_1 = require("./rabbitmq/amqp-connection");
const event_dispatcher_service_1 = require("./rabbitmq/event-dispatcher.service");
let MessagingBootstrap = class MessagingBootstrap {
    constructor(amqp, dispatcher, relay, logger) {
        this.amqp = amqp;
        this.dispatcher = dispatcher;
        this.relay = relay;
        this.logger = logger;
    }
    async onApplicationBootstrap() {
        await this.amqp.connect();
        await this.dispatcher.start();
        this.relay.start();
        this.logger.log('Messaging started');
    }
    async onApplicationShutdown() {
        this.relay.stop();
        await this.amqp.close();
        this.logger.log('Messaging stopped');
    }
};
exports.MessagingBootstrap = MessagingBootstrap;
exports.MessagingBootstrap = MessagingBootstrap = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [amqp_connection_1.AmqpConnection,
        event_dispatcher_service_1.EventDispatcherService,
        outbox_relay_service_1.OutboxRelayService,
        logger_1.BaseLogger])
], MessagingBootstrap);
//# sourceMappingURL=messaging.bootstrap.js.map