import Joi from 'joi';

import { emailSchema, passwordSchema, uriSchema } from 'src/features/common/joi-validations';

export const signUpSchema = Joi.object({
  email: emailSchema.required(),
  password: passwordSchema.required(),
});

export const googleAccountSchema = Joi.object({
  accountId: Joi.string().trim().lowercase().min(1).max(255).required(),
  email: emailSchema.required(),
  imageUri: uriSchema.required(),
});

export const azureAdAccountSchema = Joi.object({
  accountId: Joi.string().trim().min(1).max(255).required(),
  email: emailSchema.required(),
});

export const confirmEmailSchema = Joi.object({
  token: Joi.string().trim().min(1).required(),
});

export const forgotPasswordSchema = Joi.object({
  email: emailSchema.required(),
});

export const resetPasswordSchema = Joi.object({
  token: Joi.string().trim().min(1).required(),
  password: passwordSchema.required(),
});
