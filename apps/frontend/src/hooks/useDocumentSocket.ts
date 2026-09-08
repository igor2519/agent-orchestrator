'use client';

import { useEffect, useState } from 'react';

export interface DocumentSocketEvent {
  documentId: string;
  correlationId: string;
  status: string | null;
  eventType: string;
  occurredAt: string;
  channel?: string;
}

export type SocketState = 'connecting' | 'open' | 'closed';

const MAX_EVENTS = 100;
const RECONNECT_DELAY_MS = 3_000;

/**
 * Live document milestones over WebSocket.
 *
 * The socket URL is fetched from the server on every connect because it carries a
 * ticket that expires in a minute; reconnecting therefore means asking for a fresh
 * one rather than reusing a stale URL.
 *
 * Reconnection is deliberately simple - any drop is retried on a fixed delay.
 * Events that occurred while disconnected are lost, which is acceptable because the
 * document itself remains the source of truth.
 */
export const useDocumentSocket = () => {
  const [events, setEvents] = useState<DocumentSocketEvent[]>([]);
  const [state, setState] = useState<SocketState>('connecting');

  useEffect(() => {
    let socket: WebSocket | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    const scheduleRetry = () => {
      if (!disposed) {
        retryTimer = setTimeout(() => void connect(), RECONNECT_DELAY_MS);
      }
    };

    // Declared as a hoisted function so the close handler can call it without
    // referencing a const that is still being initialised.
    async function connect(): Promise<void> {
      if (disposed) {
        return;
      }

      setState('connecting');

      try {
        const response = await fetch('/api/documents/ws-ticket', { method: 'POST' });

        if (!response.ok) {
          throw new Error('Ticket request failed');
        }

        const { url } = (await response.json()) as { url: string };

        if (disposed) {
          return;
        }

        socket = new WebSocket(url);
        socket.onopen = () => setState('open');
        socket.onmessage = (message: MessageEvent<string>) => {
          try {
            const event = JSON.parse(message.data) as DocumentSocketEvent;

            setEvents((current) => [event, ...current].slice(0, MAX_EVENTS));
          } catch {
            // A malformed frame must not tear down the subscription.
          }
        };
        socket.onclose = () => {
          setState('closed');
          scheduleRetry();
        };
      } catch {
        setState('closed');
        scheduleRetry();
      }
    }

    void connect();

    return () => {
      disposed = true;

      if (retryTimer) {
        clearTimeout(retryTimer);
      }

      socket?.close();
    };
  }, []);

  return { events, state };
};
