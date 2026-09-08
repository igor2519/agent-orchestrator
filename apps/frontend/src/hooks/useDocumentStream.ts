'use client';

import { useEffect, useRef, useState } from 'react';

export interface DocumentStatusEvent {
  documentId: string;
  correlationId: string;
  status: string | null;
  eventType: string;
  notificationStatus?: string;
  occurredAt: string;
}

export type StreamState = 'connecting' | 'open' | 'closed';

const MAX_EVENTS = 100;

/**
 * Subscribes to document milestones as they happen.
 *
 * The stream is a convenience, not a source of truth: `EventSource` reconnects on
 * its own but any events during the gap are simply missed, so a consumer that
 * needs certainty re-reads the document.
 */
export const useDocumentStream = () => {
  const [events, setEvents] = useState<DocumentStatusEvent[]>([]);
  const [state, setState] = useState<StreamState>('connecting');
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const source = new EventSource('/api/documents/stream');

    sourceRef.current = source;
    source.onopen = () => setState('open');
    source.onerror = () => setState('closed');
    source.onmessage = (message: MessageEvent<string>) => {
      try {
        const event = JSON.parse(message.data) as DocumentStatusEvent;

        // Newest first, bounded so a long-lived tab cannot grow without limit.
        setEvents((current) => [event, ...current].slice(0, MAX_EVENTS));
      } catch {
        // A malformed frame must not tear down the subscription.
      }
    };

    return () => {
      source.close();
      sourceRef.current = null;
    };
  }, []);

  return { events, state };
};
