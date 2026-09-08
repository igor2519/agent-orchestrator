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
  callbackUrl: callbackUrlSchema,
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

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/**
 * Formats accepted for upload.
 *
 * Both the mime type and the extension are checked: browsers disagree on the mime
 * type for .doc and .txt, and a mime type is client-supplied anyway, so the
 * extension is the corroborating signal.
 */
export const ACCEPTED_UPLOADS: Record<string, readonly string[]> = {
  'application/pdf': ['.pdf'],
  'text/plain': ['.txt'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
};

const ACCEPTED_EXTENSIONS = Object.values(ACCEPTED_UPLOADS).flat();

export const uploadedFileSchema = Joi.object({
  originalname: Joi.string()
    .required()
    .custom((value: string, helpers) =>
      ACCEPTED_EXTENSIONS.some((ext) => value.toLowerCase().endsWith(ext))
        ? value
        : helpers.error('file.extension'),
    ),
  mimetype: Joi.string()
    .valid(...Object.keys(ACCEPTED_UPLOADS))
    .required()
    .messages({ 'any.only': 'Only PDF, TXT and Word documents are accepted' }),
  size: Joi.number().integer().min(1).max(MAX_UPLOAD_BYTES).required().messages({
    'number.max': 'File exceeds the 10MB limit',
    'number.min': 'File is empty',
  }),
})
  .unknown(true)
  .messages({
    'file.extension': `File must be one of: ${ACCEPTED_EXTENSIONS.join(', ')}`,
    'object.base': 'A file is required',
  });

export const uploadDocumentSchema = Joi.object({
  customerId: Joi.string().trim().min(1).max(128).required(),
  documentReference: Joi.string().trim().min(1).max(255),
  notificationMode: Joi.string().valid('WEBSOCKET', 'WEBHOOK', 'BOTH'),
});

export interface UploadDocumentInput {
  customerId: string;
  documentReference?: string;
  notificationMode?: 'WEBSOCKET' | 'WEBHOOK' | 'BOTH';
}

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
  /** Optional: falls back to the customer's configured callback URL. */
  callbackUrl?: string;
}

export interface ListDocumentsInput {
  limit: number;
  offset: number;
  customerId?: string;
  status?: DocumentStatus;
  submittedFrom?: Date;
  submittedTo?: Date;
}
