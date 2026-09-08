'use client';

import { useEffect, useState } from 'react';

import type { FormEvent } from 'react';

export type NotificationMode = 'WEBSOCKET' | 'WEBHOOK' | 'BOTH';

interface Settings {
  callbackUrl: string | null;
  notificationMode: NotificationMode;
}

interface Props {
  customerId: string;
}

const MODES: { value: NotificationMode; label: string; hint: string }[] = [
  { value: 'WEBSOCKET', label: 'WebSocket', hint: 'Live updates in this page. No setup needed.' },
  { value: 'WEBHOOK', label: 'Webhook', hint: 'Signed HTTP callbacks to your server.' },
  { value: 'BOTH', label: 'Both', hint: 'Live updates and callbacks.' },
];

/**
 * Notification preferences for a customer.
 *
 * WebSocket is the default and always active, so a customer who configures nothing
 * still sees their documents progress. A webhook URL is required before the webhook
 * channels can be selected, which the API enforces too.
 */
export function WebhookSettings({ customerId }: Props) {
  const [callbackUrl, setCallbackUrl] = useState('');
  const [mode, setMode] = useState<NotificationMode>('WEBSOCKET');
  const [status, setStatus] = useState<'loading' | 'ready' | 'saving'>('loading');
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(`/api/customers/${customerId}/settings`);
        const settings = (await response.json()) as Settings;

        setCallbackUrl(settings.callbackUrl ?? '');
        setMode(settings.notificationMode);
      } catch {
        setMessage({ kind: 'error', text: 'Could not load settings' });
      } finally {
        setStatus('ready');
      }
    };

    void load();
  }, [customerId]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setStatus('saving');
    setMessage(null);

    try {
      const response = await fetch(`/api/customers/${customerId}/settings`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ callbackUrl: callbackUrl.trim() || null, notificationMode: mode }),
      });
      const body = (await response.json()) as { errors?: Record<string, string>; message?: string };

      setMessage(
        response.ok
          ? { kind: 'ok', text: 'Settings saved' }
          : {
              kind: 'error',
              text: Object.values(body.errors ?? {})[0] ?? body.message ?? 'Could not save',
            },
      );
    } catch {
      setMessage({ kind: 'error', text: 'Could not save settings' });
    } finally {
      setStatus('ready');
    }
  };

  if (status === 'loading') {
    return <p className="p-6 text-sm text-stone-500">Loading settings…</p>;
  }

  return (
    <form className="flex max-w-xl flex-col gap-4 p-6" onSubmit={onSubmit}>
      <div>
        <h2 className="text-lg font-semibold">Notification settings</h2>
        <p className="text-sm text-stone-600">
          Where results for <code>{customerId}</code> are delivered.
        </p>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Webhook URL</span>
        <input
          className="rounded border border-stone-300 px-3 py-2"
          onChange={(event) => setCallbackUrl(event.target.value)}
          placeholder="https://your-system.example/webhooks/documents"
          value={callbackUrl}
        />
        <span className="text-xs text-stone-500">
          Requests are signed; verify the <code>x-signature</code> header.
        </span>
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Notification mode</legend>
        {MODES.map((option) => (
          <label
            className="flex items-start gap-2"
            htmlFor={`mode-${option.value}`}
            key={option.value}
          >
            <input
              checked={mode === option.value}
              className="mt-1"
              id={`mode-${option.value}`}
              name="notificationMode"
              onChange={() => setMode(option.value)}
              type="radio"
              value={option.value}
            />
            <span className="text-sm">
              {option.label}
              <span className="block text-xs text-stone-500">{option.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <button className="btn btn-primary self-start" disabled={status === 'saving'} type="submit">
        {status === 'saving' ? 'Saving…' : 'Save settings'}
      </button>

      {message ? (
        <p
          className={`rounded border p-3 text-sm ${
            message.kind === 'ok' ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'
          }`}
        >
          {message.text}
        </p>
      ) : null}
    </form>
  );
}
