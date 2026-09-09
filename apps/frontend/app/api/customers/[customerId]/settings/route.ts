import { envUtil } from 'src/utils';
import { fetchUpstream, handleUpstream } from 'src/utils/upstream';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ customerId: string }>;
}

const proxy = async (
  customerId: string,
  init: RequestInit & { method: string },
): Promise<Response> => {
  const env = envUtil.getEnv();

  return handleUpstream(env.backendUrl, async () => {
    const upstream = await fetchUpstream(
      `${env.backendUrl}/customers/${customerId}/settings`,
      { ...init, headers: { ...init.headers, 'x-api-key': env.apiKey } },
      env.backendUrl,
    );

    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: { 'content-type': 'application/json' },
    });
  });
};

export async function GET(_request: Request, { params }: RouteContext): Promise<Response> {
  const { customerId } = await params;

  return proxy(customerId, { method: 'GET' });
}

export async function PUT(request: Request, { params }: RouteContext): Promise<Response> {
  const { customerId } = await params;

  return proxy(customerId, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: await request.text(),
  });
}
