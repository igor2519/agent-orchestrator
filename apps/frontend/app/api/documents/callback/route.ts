export const dynamic = 'force-dynamic';

/**
 * Webhook endpoint the frontend registers as its callback target.
 *
 * Present so a submission made from the UI has a reachable callback and the
 * delivery path is exercised end to end. Signature verification lives in the API's
 * mock receiver, which is the reference implementation of what a customer should
 * do; this one only needs to answer 200 so the delivery is recorded as successful.
 */
export function POST(): Response {
  return Response.json({ received: true });
}
