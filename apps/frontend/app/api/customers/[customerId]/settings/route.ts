import { envUtil } from 'src/utils';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ customerId: string }>;
}

const proxy = async (
  customerId: string,
  init: RequestInit & { method: string },
): Promise<Response> => {
  const env = envUtil.getEnv();

  const upstream = await fetch(`${env.backendUrl}/customers/${customerId}/settings`, {
    ...init,
    headers: { ...init.headers, 'x-api-key': env.apiKey },
    cache: 'no-store',
  });

  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: { 'content-type': 'application/json' },
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
