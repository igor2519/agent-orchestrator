import { envUtil } from 'src/utils';
import { fetchUpstream, handleUpstream } from 'src/utils/upstream';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** Streams the processed file through, so the API key stays server-side. */
export async function GET(_request: Request, { params }: RouteContext): Promise<Response> {
  const env = envUtil.getEnv();
  const { id } = await params;

  return handleUpstream(env.backendUrl, async () => {
    const upstream = await fetchUpstream(
      `${env.backendUrl}/documents/${id}/result`,
      { headers: { 'x-api-key': env.apiKey } },
      env.backendUrl,
    );

    if (!upstream.ok) {
      return Response.json({ message: 'No processed result available yet' }, { status: 404 });
    }

    return new Response(upstream.body, {
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'content-disposition':
          upstream.headers.get('content-disposition') ?? 'attachment; filename="result.txt"',
      },
    });
  });
}
