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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AmqpConnection = void 0;
const contracts_1 = require("@app/contracts");
const logger_1 = require("@app/logger");
const common_1 = require("@nestjs/common");
const amqplib_1 = require("amqplib");
const messaging_tokens_1 = require("../messaging.tokens");
const topology_1 = require("./topology");
const toError = (value) => value instanceof Error ? value : new Error(typeof value === 'string' ? value : 'Publish failed');
let AmqpConnection = class AmqpConnection {
    constructor(options, logger) {
        this.options = options;
        this.logger = logger;
        this.subscriptions = new Map();
    }
    async connect() {
        this.model = await (0, amqplib_1.connect)(this.options.url, {
            recovery: {
                setup: async (model) => {
                    const channel = await model.createChannel();
                    await (0, topology_1.assertTopology)(channel);
                    await channel.close();
                },
            },
        });
        this.model.on('disconnect', (error) => this.logger.warn('AMQP disconnected, recovery in progress', { error: String(error) }));
        this.model.on('reconnect-scheduled', (info) => this.logger.warn('AMQP reconnect scheduled', { attempt: info.attempt, delay: info.delay }));
        this.model.on('connect', () => {
            void this.openChannels().catch((error) => this.logger.error('Failed to reopen AMQP channels after reconnect', error));
        });
        await this.openChannels();
    }
    async openChannels() {
        if (!this.model) {
            throw new Error('AMQP connection has not been established');
        }
        this.publishChannel = await this.model.createConfirmChannel();
        this.consumeChannel = await this.model.createChannel();
        await this.consumeChannel.prefetch(this.options.prefetch);
        for (const [queue, handler] of this.subscriptions) {
            await this.startConsuming(queue, handler);
        }
        this.logger.log('AMQP channels ready', { prefetch: this.options.prefetch });
    }
    async publish(routingKey, envelope) {
        const channel = this.publishChannel;
        if (!channel) {
            throw new Error('AMQP publish channel is not open');
        }
        const content = Buffer.from(JSON.stringify(envelope));
        await new Promise((resolve, reject) => {
            var _a;
            const accepted = channel.publish(contracts_1.EXCHANGE, routingKey, content, {
                persistent: true,
                contentType: 'application/json',
                messageId: envelope.id,
                correlationId: envelope.correlationId,
                type: envelope.type,
                timestamp: Date.now(),
                headers: {
                    'x-causation-id': (_a = envelope.causationId) !== null && _a !== void 0 ? _a : '',
                    'x-document-id': envelope.documentId,
                    'x-attempt': envelope.attempt,
                },
            }, (error) => (error ? reject(toError(error)) : resolve()));
            if (!accepted) {
                channel.once('drain', () => undefined);
            }
        });
    }
    async subscribe(queue, handler) {
        this.subscriptions.set(queue, handler);
        if (this.consumeChannel) {
            await this.startConsuming(queue, handler);
        }
    }
    async startConsuming(queue, handler) {
        const channel = this.consumeChannel;
        if (!channel) {
            return;
        }
        await channel.consume(queue, (message) => {
            if (!message) {
                return;
            }
            void this.handleMessage(queue, message, handler);
        }, { noAck: false });
        this.logger.log('Subscribed to queue', { queue });
    }
    async handleMessage(queue, message, handler) {
        const channel = this.consumeChannel;
        if (!channel) {
            return;
        }
        let envelope;
        try {
            envelope = JSON.parse(message.content.toString());
        }
        catch (error) {
            this.logger.error('Discarding unparsable message', error, { queue });
            channel.nack(message, false, false);
            return;
        }
        try {
            await handler(envelope, message);
            channel.ack(message);
        }
        catch (error) {
            this.logger.error('Handler failed, routing message to DLQ', error, {
                queue,
                eventId: envelope.id,
                eventType: envelope.type,
                correlationId: envelope.correlationId,
            });
            channel.nack(message, false, false);
        }
    }
    async close() {
        var _a, _b, _c;
        await ((_a = this.consumeChannel) === null || _a === void 0 ? void 0 : _a.close().catch(() => undefined));
        await ((_b = this.publishChannel) === null || _b === void 0 ? void 0 : _b.close().catch(() => undefined));
        await ((_c = this.model) === null || _c === void 0 ? void 0 : _c.close().catch(() => undefined));
    }
};
exports.AmqpConnection = AmqpConnection;
exports.AmqpConnection = AmqpConnection = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(messaging_tokens_1.MESSAGING_OPTIONS)),
    __metadata("design:paramtypes", [Object, logger_1.BaseLogger])
], AmqpConnection);
//# sourceMappingURL=amqp-connection.js.map