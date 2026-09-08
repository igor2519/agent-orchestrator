import { BaseNotificationProvider, NotificationChannel } from './base-notification-provider';
import { NotificationProviderRegistry } from './notification-provider.registry';

import type {
  NotificationCandidate,
  NotificationDeliveryResult,
} from './base-notification-provider';

class StubProvider extends BaseNotificationProvider {
  constructor(
    readonly channel: NotificationChannel,
    private readonly applies: boolean,
  ) {
    super();
  }

  supports(): boolean {
    return this.applies;
  }

  deliver(): Promise<NotificationDeliveryResult> {
    return Promise.resolve({
      succeeded: true,
      statusCode: null,
      latencyMs: 0,
      error: null,
      responseSnippet: null,
      permanent: false,
    });
  }
}

const candidate: NotificationCandidate = {
  callbackUrl: 'https://example.test/hook',
  eventType: 'DocumentProcessed',
};

describe('NotificationProviderRegistry', () => {
  it('returns every provider that claims the notification', () => {
    const registry = new NotificationProviderRegistry([
      new StubProvider(NotificationChannel.Webhook, true),
      new StubProvider(NotificationChannel.Websocket, true),
    ]);

    expect(registry.applicableTo(candidate)).toHaveLength(2);
  });

  it('omits providers that opt out', () => {
    const registry = new NotificationProviderRegistry([
      new StubProvider(NotificationChannel.Webhook, false),
      new StubProvider(NotificationChannel.Websocket, true),
    ]);

    expect(registry.applicableTo(candidate).map((p) => p.channel)).toStrictEqual([
      NotificationChannel.Websocket,
    ]);
  });

  it('resolves a provider by its channel', () => {
    const registry = new NotificationProviderRegistry([
      new StubProvider(NotificationChannel.Webhook, true),
    ]);

    expect(registry.byChannel(NotificationChannel.Webhook)?.channel).toBe(
      NotificationChannel.Webhook,
    );
    expect(registry.byChannel(NotificationChannel.Websocket)).toBeUndefined();
  });

  it('reports the registered channels for operational visibility', () => {
    const registry = new NotificationProviderRegistry([
      new StubProvider(NotificationChannel.Webhook, true),
      new StubProvider(NotificationChannel.Websocket, true),
    ]);

    expect(registry.channels).toStrictEqual(['WEBHOOK', 'WEBSOCKET']);
  });
});
