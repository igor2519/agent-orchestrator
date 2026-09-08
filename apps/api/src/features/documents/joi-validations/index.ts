import { DocumentStatus } from '@app/contracts';
import Joi from 'joi';

import { paginationQuerySchema } from 'src/features/common/joi-validations';

/**
 * Callback URLs come from customers, so they are a server-side request forgery
 * vector: an unchecked URL lets a caller point our webhook at internal services.
 * Private and loopback targets are rejected unless explicitly allowed, which local
 * development does to reach the mock receiver.
 */
const BLOCKED_CALLBACK_HOSTS =
  /^(localhost|127\.|0\.0\.0\.0|169\.254\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i;

const allowsPrivateCallbacks = () => process.env.ALLOW_PRIVATE_CALLBACK_URLS === 'true';

const callbackUrlSchema = Joi.string()
  .uri({ scheme: ['http', 'https'] })
  .max(2000)
  .custom((value: string, helpers) => {
    if (allowsPrivateCallbacks()) {
      return value;
    }

    return BLOCKED_CALLBACK_HOSTS.test(new URL(value).hostname)
      ? helpers.error('callbackUrl.private')
      : value;
  })
  .messages({
    'callbackUrl.private': 'Callback URL must not target a private or loopback address',
    'string.uri': 'Callback URL must be an absolute http or https URL',
  });

export const submitDocumentSchema = Joi.object({
  customerId: Joi.string().trim().min(1).max(128).required(),
  documentReference: Joi.string().trim().min(1).max(255).required(),
  documentType: Joi.string().trim().min(1).max(64).required(),
  payload: Joi.object().unknown(true),
  payloadUri: Joi.string().uri().max(2000),
  callbackUrl: callbackUrlSchema.required(),
})
  // Exactly one payload source: inline content or a reference to it.
  .xor('payload', 'payloadUri')
  .messages({
    'object.xor': 'Provide exactly one of payload or payloadUri',
    'object.missing': 'Provide exactly one of payload or payloadUri',
  });

export const listDocumentsSchema = paginationQuerySchema.keys({
  customerId: Joi.string().trim().min(1).max(128),
  status: Joi.string().valid(...Object.values(DocumentStatus)),
  submittedFrom: Joi.date().iso(),
  submittedTo: Joi.date().iso(),
});

export const documentIdParamSchema = Joi.object({
  id: Joi.string().guid({ version: 'uuidv4' }).required(),
});

/*
 * Joi validates at runtime but infers no TypeScript types, so the validated shapes
 * are declared explicitly. They must be kept in step with the schemas above; the
 * DTOs that Swagger publishes are the third view of the same contract.
 */

export interface SubmitDocumentInput {
  customerId: string;
  documentReference: string;
  documentType: string;
  payload?: Record<string, unknown>;
  payloadUri?: string;
  callbackUrl: string;
}

export interface ListDocumentsInput {
  limit: number;
  offset: number;
  customerId?: string;
  status?: DocumentStatus;
  submittedFrom?: Date;
  submittedTo?: Date;
}
