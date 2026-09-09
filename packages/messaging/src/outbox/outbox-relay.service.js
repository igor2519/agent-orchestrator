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
exports.OutboxRelayService = void 0;
const logger_1 = require("@app/logger");
const common_1 = require("@nestjs/common");
const messaging_tokens_1 = require("../messaging.tokens");
const amqp_connection_1 = require("../rabbitmq/amqp-connection");
const outbox_repository_1 = require("./outbox.repository");
let OutboxRelayService = class OutboxRelayService {
    constructor(options, repository, amqp, logger) {
        this.options = options;
        this.repository = repository;
        this.amqp = amqp;
        this.logger = logger;
        this.running = false;
    }
    start() {
        this.timer = setInterval(() => {
            void this.tick();
        }, this.options.relayIntervalMs);
        this.timer.unref();
    }
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = undefined;
        }
    }
    async tick() {
        if (this.running) {
            return 0;
        }
        this.running = true;
        try {
            return await this.publishDueMessages();
        }
        catch (error) {
            this.logger.error('Outbox relay tick failed', error);
            return 0;
        }
        finally {
            this.running = false;
        }
    }
    async publishDueMessages() {
        const due = await this.repository.claimDue(this.options.relayBatchSize);
        let published = 0;
        for (const message of due) {
            const logger = this.logger.child({
                correlationId: message.correlationId,
                documentId: message.documentId,
                eventType: message.type,
                eventId: message.id,
            });
            try {
                await this.amqp.publish(message.routingKey, message.envelope);
                await this.repository.markPublished(message.id, message.attempts + 1);
                published += 1;
                logger.debug('Outbox message published');
            }
            catch (error) {
                await this.recordFailure(message, error, logger);
            }
        }
        return published;
    }
    async recordFailure(message, error, logger) {
        const attempts = message.attempts + 1;
        const exhausted = attempts >= this.options.relayMaxAttempts;
        const availableAt = new Date(Date.now() + (exhausted ? 24 * 60 * 60000 : 5000));
        await this.repository.markFailed(message.id, attempts, error instanceof Error ? error.message : String(error), availableAt);
        if (exhausted) {
            logger.error('Outbox message exceeded publish attempts, parked for operator', error, {
                attempts,
            });
        }
        else {
            logger.warn('Outbox publish failed, will retry', { attempts });
        }
    }
};
exports.OutboxRelayService = OutboxRelayService;
exports.OutboxRelayService = OutboxRelayService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(messaging_tokens_1.MESSAGING_OPTIONS)),
    __metadata("design:paramtypes", [Object, outbox_repository_1.OutboxRepository,
        amqp_connection_1.AmqpConnection,
        logger_1.BaseLogger])
], OutboxRelayService);
//# sourceMappingURL=outbox-relay.service.js.map