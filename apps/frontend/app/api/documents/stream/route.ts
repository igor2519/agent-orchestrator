import { envUtil } from 'src/utils';
import { fetchUpstream, handleUpstream } from 'src/utils/upstream';

// The stream must stay open, so it cannot be statically rendered or cached.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Proxies the API's server-sent event stream to the browser.
 *
 * `EventSource` cannot set request headers, so the browser could not authenticate
 * against the API directly. Proxying here keeps the API key on the server - where
 * it already lives - instead of putting it in a query string that would end up in
 * browser history and access logs.
 */
export async function GET(): Promise<Response> {
  const env = envUtil.getEnv();

  return handleUpstream(env.backendUrl, async () => {
    const upstream = await fetchUpstream(
      `${env.backendUrl}/documents/stream`,
      { headers: { 'x-api-key': env.apiKey, accept: 'text/event-stream' } },
      env.backendUrl,
    );

    if (!upstream.ok || !upstream.body) {
      return new Response('Unable to open document stream', { status: 502 });
    }

    return new Response(upstream.body, {
      headers: {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache, no-transform',
        connection: 'keep-alive',
      },
    });
  });
}
