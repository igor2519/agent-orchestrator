import Joi from 'joi';

const MAX_PAGE = 200;

export const pendingOutboxQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(MAX_PAGE).default(50),
});

export const eventIdParamSchema = Joi.object({
  eventId: Joi.string().guid({ version: 'uuidv4' }).required(),
});
