import { randomUUID } from 'node:crypto';

import { envUtil } from 'src/utils';
import { fetchUpstream, handleUpstream } from 'src/utils/upstream';

export const dynamic = 'force-dynamic';

/** Passes the API's own response through unchanged, body and status alike. */
const forward = (url: string, init: RequestInit, backendUrl: string): Promise<Response> =>
  handleUpstream(backendUrl, async () => {
    const upstream = await fetchUpstream(url, init, backendUrl);

    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: { 'content-type': 'application/json' },
    });
  });

/**
 * Proxies a document submission so the API key never reaches the browser.
 *
 * An `Idempotency-Key` is generated per request: a double-clicked submit button
 * would otherwise be two distinct submissions as far as the API is concerned.
 */
export async function POST(request: Request): Promise<Response> {
  const env = envUtil.getEnv();
  const body: unknown = await request.json();
  const idempotencyKey = request.headers.get('idempotency-key') ?? randomUUID();

  return forward(
    `${env.backendUrl}/documents`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': env.apiKey,
        'idempotency-key': idempotencyKey,
      },
      body: JSON.stringify(body),
    },
    env.backendUrl,
  );
}

export function GET(request: Request): Promise<Response> {
  const env = envUtil.getEnv();
  const query = new URL(request.url).searchParams.toString();

  return forward(
    `${env.backendUrl}/documents?${query}`,
    { headers: { 'x-api-key': env.apiKey } },
    env.backendUrl,
  );
}
