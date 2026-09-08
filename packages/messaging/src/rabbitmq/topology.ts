import { DEAD_LETTER_EXCHANGE, EXCHANGE, QUEUE_BINDINGS, deadLetterQueueOf } from '@app/contracts';

import type { Queue, RoutingKey } from '@app/contracts';
import type { Channel } from 'amqplib';

/**
 * Declares the whole topology: durable exchanges, durable queues, their bindings
 * and a dead-letter queue per queue.
 *
 * Every service asserts the complete topology rather than only its own queue.
 * Declarations are idempotent, so this removes any start-up ordering requirement
 * between services and guarantees a publisher never drops a message because a
 * consumer had not booted yet.
 */
export const assertTopology = async (channel: Channel): Promise<void> => {
  await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
  await channel.assertExchange(DEAD_LETTER_EXCHANGE, 'topic', { durable: true });

  const entries = Object.entries(QUEUE_BINDINGS) as [Queue, readonly RoutingKey[]][];

  for (const [queue, routingKeys] of entries) {
    const deadLetterQueue = deadLetterQueueOf(queue);

    // Parked messages keep a queue-specific key so an operator can tell which
    // consumer rejected them.
    await channel.assertQueue(deadLetterQueue, { durable: true });
    await channel.bindQueue(deadLetterQueue, DEAD_LETTER_EXCHANGE, deadLetterQueue);

    await channel.assertQueue(queue, {
      durable: true,
      deadLetterExchange: DEAD_LETTER_EXCHANGE,
      deadLetterRoutingKey: deadLetterQueue,
    });

    for (const routingKey of routingKeys) {
      await channel.bindQueue(queue, EXCHANGE, routingKey);
    }
  }
};
