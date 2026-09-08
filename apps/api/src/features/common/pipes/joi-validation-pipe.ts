import { Injectable } from '@nestjs/common';
import Joi from 'joi';

import { ValidationBadRequestException } from '../exceptions';

import type { PipeTransform } from '@nestjs/common';

/**
 * Validates a request payload against a Joi schema.
 *
 * `abortEarly: false` so the client is told about every invalid field at once
 * rather than one per round-trip. `convert: true` (Joi's default) turns query
 * strings into the declared types. `stripUnknown` drops fields the schema does not
 * declare, so unexpected input can never reach a service.
 */
@Injectable()
export class JoiValidationPipe<TValue = unknown> implements PipeTransform<unknown, TValue> {
  constructor(private readonly schema: Joi.Schema) {}

  transform(value: unknown): TValue {
    // Annotated as `unknown` because Joi types its result as `any`; the validated
    // shape is declared separately alongside each schema.
    const result: Joi.ValidationResult<unknown> = this.schema.validate(value, {
      abortEarly: false,
      convert: true,
      stripUnknown: true,
    });

    if (result.error) {
      throw new ValidationBadRequestException(
        JoiValidationPipe.toFieldErrors(result.error),
        'Validation failed',
      );
    }

    return result.value as TValue;
  }

  /**
   * Collapses Joi's detail list into one message per field path.
   *
   * Object-level rules such as `xor` carry an empty path, so they are keyed to the
   * first field they concern rather than to an opaque placeholder - a client
   * highlighting invalid inputs needs a field name.
   */
  private static toFieldErrors(error: Joi.ValidationError): Record<string, string> {
    const result: Record<string, string> = {};

    for (const detail of error.details) {
      const path = detail.path.filter((segment) => segment !== '').join('.');
      const peers = detail.context?.peers as string[] | undefined;
      const key = path || peers?.[0] || String(detail.context?.key ?? '_');

      result[key] ??= detail.message;
    }

    return result;
  }
}
