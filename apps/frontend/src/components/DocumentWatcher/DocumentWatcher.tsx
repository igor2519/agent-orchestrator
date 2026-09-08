'use client';

import { useDocumentSocket } from 'src/hooks/useDocumentSocket';

const STATE_LABELS: Record<string, string> = {
  connecting: 'connecting…',
  open: 'live (websocket)',
  closed: 'reconnecting…',
};

/**
 * Submits a document and watches its progress arrive in real time.
 *
 * The events shown here mirror the webhooks the notification service delivers to
 * customer endpoints; a browser cannot receive those directly, so it subscribes to
 * the API's stream instead.
 */
export function DocumentWatcher() {
  // WebSocket rather than SSE: the notification service treats it as a real
  // delivery channel, so what arrives here is the same broadcast a customer's
  // webhook receives.
  const { events, state } = useDocumentSocket();

  return (
    <div className="p-6">
      <div className="mb-2 flex items-center gap-2">
        <h2 className="text-lg font-semibold">Live events</h2>
        <span
          className={`rounded px-2 py-0.5 text-xs ${
            state === 'open'
              ? 'bg-green-100 text-green-800'
              : state === 'connecting'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-red-100 text-red-800'
          }`}
        >
          {STATE_LABELS[state]}
        </span>
      </div>

      {events.length === 0 ? (
        <p className="text-sm text-stone-500">
          Nothing yet. Upload a document and its milestones will appear here as each service
          publishes them.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {events.map((event, index) => (
            <li
              className="rounded border border-stone-200 p-3 text-sm"
              key={`${event.documentId}-${event.eventType}-${index}`}
            >
              <div className="font-medium">{event.eventType}</div>
              <div className="text-stone-600">
                {event.status ? `status: ${event.status}` : null}
                {event.channel ? ` \u00b7 via ${event.channel}` : null}
              </div>
              <code className="text-xs text-stone-400">{event.documentId}</code>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
