import type { NotificationDelivery } from '../entities/notification-delivery.entity';

/**
 * The minimum a provider needs to decide whether it applies.
 *
 * Narrower than a persisted delivery so intake can ask the question before any row
 * exists, and a stored {@link NotificationDelivery} satisfies it structurally.
 */
export interface NotificationCandidate {
  callbackUrl?: string | null;
  eventType: string;
}

export const NotificationChannel = {
  Webhook: 'WEBHOOK',
  Websocket: 'WEBSOCKET',
} as const;

export type NotificationChannel = (typeof NotificationChannel)[keyof typeof NotificationChannel];

/** Outcome of one delivery attempt, whatever the transport. */
export interface NotificationDeliveryResult {
  succeeded: boolean;
  /** HTTP status where the transport has one; null otherwise. */
  statusCode: number | null;
  latencyMs: number;
  error: string | null;
  responseSnippet: string | null;
  /** True when retrying could never succeed, so remaining attempts are not spent. */
  permanent: boolean;
}

/**
 * Contract every notification channel implements.
 *
 * Adding a channel - email, Slack, a queue for another system - means extending
 * this class and registering it. Nothing in the intake or retry logic names a
 * concrete transport, so the delivery lifecycle, attempt tracking and backoff are
 * shared by every channel for free.
 *
 * Implementations must not open or join a caller's database transaction while
 * doing I/O: delivery happens outside transactions so a slow third party cannot
 * hold one open.
 */
export abstract class BaseNotificationProvider {
  /** Stored on each delivery so an operator can see which channel was used. */
  abstract readonly channel: NotificationChannel;

  /** Whether this channel can deliver the given notification. */
  abstract supports(candidate: NotificationCandidate): boolean;

  abstract deliver(delivery: NotificationDelivery): Promise<NotificationDeliveryResult>;
}

/**
 * Builds a failure result.
 *
 * A free function rather than a method on the base, because the delivery service
 * also needs one - for a delivery whose channel has no registered provider - and it
 * consumes strategies rather than being one.
 */
export const deliveryFailure = (
  error: string,
  permanent: boolean,
  latencyMs = 0,
): NotificationDeliveryResult => ({
  succeeded: false,
  statusCode: null,
  latencyMs,
  error,
  responseSnippet: null,
  permanent,
});
