import { BadRequestException, HttpStatus } from '@nestjs/common';

/**
 * Bad request carrying per-field messages.
 *
 * The response keeps the shape clients already depend on - `errors` maps a field
 * path to a single message - independently of which validation library produced
 * it.
 */
export class ValidationBadRequestException extends BadRequestException {
  constructor(
    errors: Record<string, string>,
    message = 'Validation Failed',
    description = 'Bad Request',
  ) {
    super({
      statusCode: HttpStatus.BAD_REQUEST,
      message,
      error: description,
      errors,
    });
  }
}
