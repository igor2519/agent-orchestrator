import { NotificationMode } from '@app/contracts';
import Joi from 'joi';

/**
 * Callback URLs come from customers, so they are a server-side request forgery
 * vector. Private and loopback targets are rejected unless explicitly allowed,
 * which local development does to reach the mock receiver.
 */
const BLOCKED_CALLBACK_HOSTS =
  /^(localhost|127\.|0\.0\.0\.0|169\.254\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i;

const allowsPrivateCallbacks = () => process.env.ALLOW_PRIVATE_CALLBACK_URLS === 'true';

export const callbackUrlSchema = Joi.string()
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

export const updateCustomerSettingsSchema = Joi.object({
  callbackUrl: callbackUrlSchema.allow(null, ''),
  notificationMode: Joi.string()
    .valid(...Object.values(NotificationMode))
    .default(NotificationMode.Websocket),
})
  // Selecting a webhook channel without somewhere to send it would silently
  // produce undeliverable notifications.
  .custom((value: { callbackUrl?: string; notificationMode: string }, helpers) => {
    const needsUrl =
      value.notificationMode === NotificationMode.Webhook ||
      value.notificationMode === NotificationMode.Both;

    return needsUrl && !value.callbackUrl ? helpers.error('settings.callbackRequired') : value;
  })
  .messages({
    'settings.callbackRequired': 'A callback URL is required for WEBHOOK or BOTH mode',
  });

export interface UpdateCustomerSettingsInput {
  callbackUrl?: string | null;
  notificationMode: NotificationMode;
}
