import Joi from 'joi';

import {
  emailSchema,
  imageSchema,
  passwordSchema,
  userRoleSchema,
} from 'src/features/common/joi-validations';

export const createUserSchema = Joi.object({
  email: emailSchema.required(),
  password: passwordSchema.required(),
  role: userRoleSchema,
  image: imageSchema.required(),
});

export const updateUserSchema = Joi.object({
  email: emailSchema,
  image: imageSchema,
});

const MAX_GALLERY_IMAGES = 5;

export const uploadUserFilesSchema = Joi.object({
  thumbnail: imageSchema.required(),
  images: Joi.array().items(imageSchema).max(MAX_GALLERY_IMAGES),
  someField: Joi.string().min(3).max(10).required(),
  anyNumber: Joi.number().integer().positive().required(),
  flag: Joi.boolean(),
});
