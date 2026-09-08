import 'reflect-metadata';

import type { EventType } from '@app/contracts';

export const EVENT_CONTROLLER_METADATA = Symbol('EVENT_CONTROLLER_METADATA');
export const EVENT_SUBSCRIPTION_METADATA = Symbol('EVENT_SUBSCRIPTION_METADATA');

export interface EventSubscription {
  methodName: string;
  eventTypes: readonly EventType[];
}

/**
 * Marks a class as a RabbitMQ event controller.
 *
 * An event controller is the messaging counterpart of an HTTP controller: it
 * declares which events it answers to, and the dispatcher routes to it. It never
 * reaches for the broker itself, and it never calls another service - its only
 * outputs are rows written through the supplied transaction, including outbox
 * rows that become the next event in the chain.
 */
export const MessageController = (): ClassDecorator => (target) => {
  Reflect.defineMetadata(EVENT_CONTROLLER_METADATA, true, target);
};

/**
 * Subscribes a controller method to one or more event types.
 *
 * The method receives an {@link EventContext} carrying the caller's transaction,
 * so everything it writes commits together with the inbox record for the message.
 */
export const OnEvent =
  (...eventTypes: EventType[]): MethodDecorator =>
  (target, propertyKey) => {
    const existing: EventSubscription[] =
      (Reflect.getMetadata(EVENT_SUBSCRIPTION_METADATA, target.constructor) as
        EventSubscription[] | undefined) ?? [];

    Reflect.defineMetadata(
      EVENT_SUBSCRIPTION_METADATA,
      [...existing, { methodName: String(propertyKey), eventTypes }],
      target.constructor,
    );
  };

export const isMessageController = (instance: object): boolean =>
  Reflect.getMetadata(EVENT_CONTROLLER_METADATA, instance.constructor) === true;

export const getSubscriptions = (instance: object): EventSubscription[] =>
  (Reflect.getMetadata(EVENT_SUBSCRIPTION_METADATA, instance.constructor) as
    EventSubscription[] | undefined) ?? [];
