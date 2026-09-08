import { z } from 'zod';

/**
 * Callback URLs come from customers, so they are a server-side request forgery
 * vector: an unchecked URL lets a caller point our webhook at internal services.
 * v1 requires an absolute http(s) URL and rejects obvious loopback and
 * link-local targets.
 */
const BLOCKED_CALLBACK_HOSTS =
  /^(localhost|127\.|0\.0\.0\.0|169\.254\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i;

/**
 * Private targets are rejected by default and only allowed when explicitly
 * enabled, so local development and tests can reach the mock receiver without
 * weakening the deployed configuration.
 */
const allowsPrivateCallbacks = () => process.env.ALLOW_PRIVATE_CALLBACK_URLS === 'true';

const callbackUrlSchema = z
  .string()
  .url()
  .refine((value) => /^https?:$/.test(new URL(value).protocol), {
    message: 'Callback URL must use http or https',
  })
  .refine(
    (value) => allowsPrivateCallbacks() || !BLOCKED_CALLBACK_HOSTS.test(new URL(value).hostname),
    {
      message: 'Callback URL must not target a private or loopback address',
    },
  );

export const submitDocumentSchema = z
  .object({
    customerId: z.string().min(1).max(128),
    documentReference: z.string().min(1).max(255),
    documentType: z.string().min(1).max(64),
    payload: z.record(z.string(), z.unknown()).optional(),
    payloadUri: z.string().url().optional(),
    callbackUrl: callbackUrlSchema,
  })
  .refine((value) => Boolean(value.payload) !== Boolean(value.payloadUri), {
    message: 'Provide exactly one of payload or payloadUri',
    path: ['payload'],
  });

export type SubmitDocumentInput = z.infer<typeof submitDocumentSchema>;
