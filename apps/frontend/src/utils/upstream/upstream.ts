/**
 * Talking to the API from a route handler.
 *
 * A bare `fetch` to a service that is not listening *throws*. Next catches that at
 * the route-handler boundary and answers 500 with an empty body, which tells a
 * reader nothing - the API being down is not a server error in the frontend, and
 * it is not the same thing as the API rejecting a request.
 *
 * `fetchUpstream` turns that failure into a typed error, and `handleUpstream`
 * converts it into a 502 the page can actually display.
 */
export class UpstreamUnreachableError extends Error {
  constructor(readonly backendUrl: string) {
    super(`Could not reach the API at ${backendUrl}`);
    this.name = 'UpstreamUnreachableError';
  }
}

export const fetchUpstream = async (
  url: string,
  init: RequestInit,
  backendUrl: string,
): Promise<Response> => {
  try {
    return await fetch(url, { ...init, cache: 'no-store' });
  } catch {
    throw new UpstreamUnreachableError(backendUrl);
  }
};

/** Wraps a handler so an unreachable API answers 502 instead of a bare 500. */
export const handleUpstream = async (
  backendUrl: string,
  handler: () => Promise<Response>,
): Promise<Response> => {
  try {
    return await handler();
  } catch (cause) {
    if (cause instanceof UpstreamUnreachableError) {
      return Response.json(
        { message: `Could not reach the API at ${backendUrl}. Is it running?` },
        { status: 502 },
      );
    }

    throw cause;
  }
};
