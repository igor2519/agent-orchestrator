import { PipeTransform, Injectable } from '@nestjs/common';
import { ZodError, ZodObject, ZodRawShape, core } from 'zod';

import { ValidationBadRequestException } from '../exceptions';

// zod 4 replaced the `ParseParams` type with the parse context accepted by parseAsync
type ParseContext = core.ParseContext<core.$ZodIssue>;

@Injectable()
export class ZodValidationPipe<T extends ZodRawShape> implements PipeTransform {
  constructor(
    private schema: ZodObject<T>,
    private options?: ParseContext,
  ) {}

  async transform(value: T) {
    try {
      const result = await this.schema.parseAsync(value, this.options);
      return result;
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationBadRequestException(error, 'Validation failed');
      }
      throw error;
    }
  }
}
