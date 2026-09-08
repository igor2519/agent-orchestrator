import { EventType } from '@app/contracts';

import {
  MessageController,
  OnEvent,
  getSubscriptions,
  isMessageController,
} from './event-controller';

import type { EventContext } from './messaging.tokens';

@MessageController()
class ExampleController {
  @OnEvent(EventType.DocumentSubmitted)
  async onSubmitted(_context: EventContext): Promise<void> {
    return Promise.resolve();
  }

  @OnEvent(EventType.DocumentProcessed, EventType.DocumentProcessingFailed)
  async onOutcome(_context: EventContext): Promise<void> {
    return Promise.resolve();
  }

  notASubscriber(): void {
    // no decorator, must not be routed
  }
}

class PlainService {}

describe('@MessageController / @OnEvent', () => {
  it('marks decorated classes and leaves others alone', () => {
    expect(isMessageController(new ExampleController())).toBe(true);
    expect(isMessageController(new PlainService())).toBe(false);
  });

  it('records one subscription per decorated method', () => {
    const subscriptions = getSubscriptions(new ExampleController());

    expect(subscriptions).toHaveLength(2);
    expect(subscriptions.map((s) => s.methodName).sort()).toStrictEqual([
      'onOutcome',
      'onSubmitted',
    ]);
  });

  it('supports a method subscribing to several event types', () => {
    const outcome = getSubscriptions(new ExampleController()).find(
      (s) => s.methodName === 'onOutcome',
    );

    expect(outcome?.eventTypes).toStrictEqual([
      EventType.DocumentProcessed,
      EventType.DocumentProcessingFailed,
    ]);
  });

  it('ignores undecorated methods', () => {
    const methods = getSubscriptions(new ExampleController()).map((s) => s.methodName);

    expect(methods).not.toContain('notASubscriber');
  });

  it('reports no subscriptions for an undecorated class', () => {
    expect(getSubscriptions(new PlainService())).toStrictEqual([]);
  });
});
