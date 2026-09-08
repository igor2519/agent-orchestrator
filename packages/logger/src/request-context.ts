import { AsyncLocalStorage } from 'node:async_hooks';

import type { LogContext } from './types';

/**
 * Ambient context for the unit of work currently executing.
 *
 * `AsyncLocalStorage` carries it across every `await` in a request or message
 * handler without threading a parameter through each call, so a logger obtained
 * deep in a service still knows which request it belongs to. This is what makes
 * "show me every log line for this request" answerable across services.
 */
const storage = new AsyncLocalStorage<LogContext>();

export const RequestContext = {
  /** Runs `fn` with `context` visible to everything it awaits. */
  run<TResult>(context: LogContext, fn: () => TResult): TResult {
    return storage.run(context, fn);
  },

  get(): LogContext {
    return storage.getStore() ?? {};
  },

  get requestId(): string | undefined {
    return storage.getStore()?.requestId;
  },
};
