"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertTopology = void 0;
const contracts_1 = require("@app/contracts");
const assertTopology = async (channel) => {
    await channel.assertExchange(contracts_1.EXCHANGE, 'topic', { durable: true });
    await channel.assertExchange(contracts_1.DEAD_LETTER_EXCHANGE, 'topic', { durable: true });
    const entries = Object.entries(contracts_1.QUEUE_BINDINGS);
    for (const [queue, routingKeys] of entries) {
        const deadLetterQueue = (0, contracts_1.deadLetterQueueOf)(queue);
        await channel.assertQueue(deadLetterQueue, { durable: true });
        await channel.bindQueue(deadLetterQueue, contracts_1.DEAD_LETTER_EXCHANGE, deadLetterQueue);
        await channel.assertQueue(queue, {
            durable: true,
            deadLetterExchange: contracts_1.DEAD_LETTER_EXCHANGE,
            deadLetterRoutingKey: deadLetterQueue,
        });
        for (const routingKey of routingKeys) {
            await channel.bindQueue(queue, contracts_1.EXCHANGE, routingKey);
        }
    }
};
exports.assertTopology = assertTopology;
//# sourceMappingURL=topology.js.map