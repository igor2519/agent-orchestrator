import { randomUUID } from 'node:crypto';

import { envUtil } from 'src/utils';

export const dynamic = 'force-dynamic';

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

  const upstream = await fetch(`${env.backendUrl}/documents`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': env.apiKey,
      'idempotency-key': idempotencyKey,
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: { 'content-type': 'application/json' },
  });
}

export async function GET(request: Request): Promise<Response> {
  const env = envUtil.getEnv();
  const query = new URL(request.url).searchParams.toString();

  const upstream = await fetch(`${env.backendUrl}/documents?${query}`, {
    headers: { 'x-api-key': env.apiKey },
    cache: 'no-store',
  });

  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: { 'content-type': 'application/json' },
  });
}
