import 'reflect-metadata';
import type { EventType } from '@app/contracts';
export declare const EVENT_CONTROLLER_METADATA: unique symbol;
export declare const EVENT_SUBSCRIPTION_METADATA: unique symbol;
export interface EventSubscription {
    methodName: string;
    eventTypes: readonly EventType[];
}
export declare const MessageController: () => ClassDecorator;
export declare const OnEvent: (...eventTypes: EventType[]) => MethodDecorator;
export declare const isMessageController: (instance: object) => boolean;
export declare const getSubscriptions: (instance: object) => EventSubscription[];
//# sourceMappingURL=event-controller.d.ts.map