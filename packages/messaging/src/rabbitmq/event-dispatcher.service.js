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
exports.EventDispatcherService = void 0;
const logger_1 = require("@app/logger");
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const event_controller_1 = require("../event-controller");
const inbox_service_1 = require("../inbox/inbox.service");
const messaging_tokens_1 = require("../messaging.tokens");
const amqp_connection_1 = require("./amqp-connection");
let EventDispatcherService = class EventDispatcherService {
    constructor(options, controllers, dataSource, inbox, amqp, logger) {
        this.options = options;
        this.controllers = controllers;
        this.dataSource = dataSource;
        this.inbox = inbox;
        this.amqp = amqp;
        this.logger = logger;
        this.routes = new Map();
    }
    async start() {
        this.buildRoutingTable();
        const { queue } = this.options;
        if (!queue) {
            return;
        }
        await this.amqp.subscribe(queue, (envelope) => this.dispatch(envelope));
    }
    buildRoutingTable() {
        var _a;
        for (const controller of this.controllers) {
            if (!(0, event_controller_1.isMessageController)(controller)) {
                this.logger.warn('Provider is not a @MessageController, skipping', {
                    provider: controller.constructor.name,
                });
                continue;
            }
            for (const { methodName, eventTypes } of (0, event_controller_1.getSubscriptions)(controller)) {
                const method = controller[methodName];
                if (typeof method !== 'function') {
                    continue;
                }
                for (const eventType of eventTypes) {
                    const routes = (_a = this.routes.get(eventType)) !== null && _a !== void 0 ? _a : [];
                    routes.push({
                        controller: controller.constructor.name,
                        method: method.bind(controller),
                    });
                    this.routes.set(eventType, routes);
                }
            }
        }
        this.logger.log('Event routes registered', {
            routes: [...this.routes.entries()].map(([type, routes]) => `${type} -> ${routes.map((r) => r.controller).join(',')}`),
        });
    }
    async dispatch(envelope) {
        var _a, _b, _c;
        const { queue } = this.options;
        if (!queue) {
            return;
        }
        const logger = this.logger.child({
            requestId: (_a = envelope.requestId) !== null && _a !== void 0 ? _a : undefined,
            correlationId: envelope.correlationId,
            causationId: envelope.id,
            documentId: envelope.documentId,
            eventType: envelope.type,
            attempt: envelope.attempt,
        });
        const routes = (_b = this.routes.get(envelope.type)) !== null && _b !== void 0 ? _b : [];
        if (routes.length === 0) {
            logger.debug('No controller subscribed to event, acknowledging');
            return;
        }
        const afterCommit = [];
        const onCommit = (callback) => afterCommit.push(callback);
        await logger_1.RequestContext.run({ requestId: (_c = envelope.requestId) !== null && _c !== void 0 ? _c : undefined, correlationId: envelope.correlationId }, async () => this.handleInTransaction(envelope, queue, routes, logger, onCommit));
        for (const callback of afterCommit) {
            try {
                callback();
            }
            catch (error) {
                logger.error('Post-commit callback failed', error);
            }
        }
        logger.log('Event processed');
    }
    async handleInTransaction(envelope, queue, routes, logger, onCommit) {
        await this.dataSource.transaction(async (manager) => {
            if (await this.inbox.hasProcessed(manager, envelope.id, queue)) {
                logger.debug('Duplicate event ignored');
                return;
            }
            for (const route of routes) {
                await route.method({ manager, envelope, logger, onCommit });
            }
            await this.inbox.markProcessed(manager, envelope.id, queue, envelope.type);
        });
    }
};
exports.EventDispatcherService = EventDispatcherService;
exports.EventDispatcherService = EventDispatcherService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(messaging_tokens_1.MESSAGING_OPTIONS)),
    __param(1, (0, common_1.Inject)(messaging_tokens_1.EVENT_CONTROLLERS)),
    __metadata("design:paramtypes", [Object, Array, typeorm_1.DataSource,
        inbox_service_1.InboxService,
        amqp_connection_1.AmqpConnection,
        logger_1.BaseLogger])
], EventDispatcherService);
//# sourceMappingURL=event-dispatcher.service.js.map