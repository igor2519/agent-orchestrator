import Joi from 'joi';

import fileConstants, { singleImageUploadLimits } from 'src/constants/files';

export const emailSchema = Joi.string().trim().lowercase().email().max(255);

export const passwordSchema = Joi.string().min(8).max(255);

export const uriSchema = Joi.string().trim().uri().max(1000);

/**
 * Shape of a Multer file as it reaches a controller.
 *
 * `unknown(true)` because Multer attaches buffer/stream fields we neither validate
 * nor want to strip.
 */
export const fileSchema = Joi.object({
  fieldname: Joi.string().required(),
  originalname: Joi.string().required(),
  encoding: Joi.string().required(),
  mimetype: Joi.string().required(),
  size: Joi.number().required(),
}).unknown(true);

export const imageSchema = fileSchema.keys({
  size: Joi.number()
    .max(singleImageUploadLimits.fileSize)
    .required()
    .messages({ 'number.max': 'Max file size is 5MB.' }),
  mimetype: Joi.string()
    .valid(...fileConstants.imageMimeTypes)
    .required()
    .messages({ 'any.only': '.jpg, .jpeg, .png and .webp files are accepted.' }),
});

/** Query strings arrive as text; Joi's default conversion coerces them to numbers. */
export const paginationQuerySchema = Joi.object({
  limit: Joi.number().integer().min(0).default(10),
  offset: Joi.number().integer().min(0).default(0),
});
