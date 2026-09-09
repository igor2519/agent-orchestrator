import { envUtil } from 'src/utils';
import { fetchUpstream, handleUpstream } from 'src/utils/upstream';

export const dynamic = 'force-dynamic';

/**
 * Exchanges the server-held API key for a short-lived WebSocket ticket.
 *
 * The browser never sees the API key; it receives only a ticket that expires in a
 * minute and authorises nothing but opening a socket.
 */
export async function POST(): Promise<Response> {
  const env = envUtil.getEnv();

  return handleUpstream(env.backendUrl, async () => {
    const upstream = await fetchUpstream(
      `${env.backendUrl}/documents/stream/ticket`,
      { method: 'POST', headers: { 'x-api-key': env.apiKey } },
      env.backendUrl,
    );

    if (!upstream.ok) {
      return Response.json({ message: 'Unable to obtain a stream ticket' }, { status: 502 });
    }

    const { ticket, expiresAt } = (await upstream.json()) as {
      ticket: string;
      expiresAt: string;
    };

    // The socket URL is built here so the browser never needs to know the API host.
    const socketUrl = new URL('/ws/documents', env.backendUrl);

    socketUrl.protocol = socketUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    socketUrl.searchParams.set('ticket', ticket);

    return Response.json({ url: socketUrl.toString(), expiresAt });
  });
}
