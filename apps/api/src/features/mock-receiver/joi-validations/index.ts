import Joi from 'joi';

/**
 * A customer receiver must accept whatever we send it, so the body is validated
 * only for the envelope fields this mock records; the rest passes through.
 */
export const receivedCallbackSchema = Joi.object({
  documentId: Joi.string().guid({ version: 'uuidv4' }),
  correlationId: Joi.string().guid({ version: 'uuidv4' }),
  event: Joi.string().max(64),
}).unknown(true);

export const listCallbacksQuerySchema = Joi.object({
  documentId: Joi.string().guid({ version: 'uuidv4' }),
});
