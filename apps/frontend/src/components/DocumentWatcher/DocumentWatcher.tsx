'use client';

import { useState } from 'react';

import { useDocumentSocket } from 'src/hooks/useDocumentSocket';

import type { SubmitError, SubmitResponse } from './types';
import type { FormEvent } from 'react';

const STATE_LABELS: Record<string, string> = {
  connecting: 'connecting…',
  open: 'live (websocket)',
  closed: 'reconnecting…',
};

const defaultPayload = JSON.stringify({ amount: 100, currency: 'EUR' }, null, 2);

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
  const [reference, setReference] = useState('INV-2026-000001');
  const [documentType, setDocumentType] = useState('invoice');
  const [payload, setPayload] = useState(defaultPayload);
  const [result, setResult] = useState<SubmitResponse | null>(null);
  const [error, setError] = useState<SubmitError | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          customerId: 'customer-alpha',
          documentReference: reference,
          documentType,
          payload: JSON.parse(payload) as Record<string, unknown>,
          callbackUrl: `${window.location.origin}/api/documents/callback`,
        }),
      });

      const body: unknown = await response.json();

      if (response.ok) {
        setResult(body as SubmitResponse);
      } else {
        setError(body as SubmitError);
      }
    } catch {
      setError({ message: 'Payload must be valid JSON' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 md:flex-row">
      <form className="flex w-full flex-col gap-3 md:w-1/2" onSubmit={onSubmit}>
        <h2 className="text-lg font-semibold">Submit a document</h2>

        <label className="flex flex-col gap-1">
          <span className="text-sm">Document reference</span>
          <input
            className="rounded border border-stone-300 px-3 py-2"
            onChange={(event) => setReference(event.target.value)}
            value={reference}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm">Document type</span>
          <input
            className="rounded border border-stone-300 px-3 py-2"
            onChange={(event) => setDocumentType(event.target.value)}
            value={documentType}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm">Payload (JSON)</span>
          <textarea
            className="h-32 rounded border border-stone-300 px-3 py-2 font-mono text-sm"
            onChange={(event) => setPayload(event.target.value)}
            value={payload}
          />
        </label>

        <button className="btn btn-primary" disabled={submitting} type="submit">
          {submitting ? 'Submitting…' : 'Submit'}
        </button>

        {result ? (
          <div className="rounded border border-green-300 bg-green-50 p-3 text-sm">
            <div>
              Accepted as <code>{result.id}</code> ({result.status})
            </div>
            {result.duplicate ? (
              <div className="mt-1 text-amber-700">
                Reused an existing document — matched by{' '}
                <strong>{result.deduplicatedBy ?? 'duplicate check'}</strong>, so the file was not
                processed twice.
              </div>
            ) : null}
          </div>
        ) : null}

        {error ? (
          <div className="rounded border border-red-300 bg-red-50 p-3 text-sm">
            <div>{error.message}</div>
            {error.errors ? (
              <ul className="mt-1 list-inside list-disc">
                {Object.entries(error.errors).map(([field, message]) => (
                  <li key={field}>
                    <strong>{field}</strong>: {message}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </form>

      <section className="w-full md:w-1/2">
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
            Nothing yet. Submit a document and its milestones will appear here as each service
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
                  {event.channel ? ` · via ${event.channel}` : null}
                </div>
                <code className="text-xs text-stone-400">{event.documentId}</code>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
