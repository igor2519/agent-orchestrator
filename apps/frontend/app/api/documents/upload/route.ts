import { randomUUID } from 'node:crypto';

import { envUtil } from 'src/utils';
import { fetchUpstream, handleUpstream } from 'src/utils/upstream';

export const dynamic = 'force-dynamic';

/**
 * Forwards a file upload to the API.
 *
 * The multipart body is streamed through untouched so the API performs the single
 * authoritative validation - duplicating the format rules here would let the two
 * drift apart.
 */
export async function POST(request: Request): Promise<Response> {
  const env = envUtil.getEnv();
  const form = await request.formData();

  return handleUpstream(env.backendUrl, async () => {
    const upstream = await fetchUpstream(
      `${env.backendUrl}/documents/upload`,
      {
        method: 'POST',
        headers: {
          'x-api-key': env.apiKey,
          // A double-clicked button would otherwise be two submissions.
          'idempotency-key': request.headers.get('idempotency-key') ?? randomUUID(),
        },
        body: form,
      },
      env.backendUrl,
    );

    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: { 'content-type': 'application/json' },
    });
  });
}
