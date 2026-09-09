import { describe, it, expect } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import Joi from 'joi';

import { JoiValidationPipe } from './joi-validation-pipe';

interface ErrorBody {
  statusCode: number;
  message: string;
  errors: Record<string, string>;
}

const bodyOf = (error: unknown): ErrorBody =>
  (error as BadRequestException).getResponse() as ErrorBody;

describe('JoiValidationPipe', () => {
  const schema = Joi.object({
    name: Joi.string().min(3).required(),
    age: Joi.number().integer().min(0).required(),
    nickname: Joi.string(),
  });

  const pipe = new JoiValidationPipe(schema);

  it('returns the validated value when input is valid', () => {
    expect(pipe.transform({ name: 'Ada', age: 36 })).toStrictEqual({ name: 'Ada', age: 36 });
  });

  it('coerces query-string values to their declared types', () => {
    // Query and param values always arrive as strings.
    expect(pipe.transform({ name: 'Ada', age: '36' })).toStrictEqual({ name: 'Ada', age: 36 });
  });

  it('strips fields the schema does not declare', () => {
    const result = pipe.transform({ name: 'Ada', age: 36, injected: 'nope' });

    expect(result).not.toHaveProperty('injected');
  });

  it('reports every invalid field at once rather than one per round-trip', () => {
    let caught: unknown;

    try {
      pipe.transform({ name: 'x', age: -1 });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(BadRequestException);
    expect(Object.keys(bodyOf(caught).errors).sort()).toStrictEqual(['age', 'name']);
  });

  it('keys errors by field path, including nested ones', () => {
    const nested = new JoiValidationPipe(
      Joi.object({ profile: Joi.object({ email: Joi.string().email().required() }).required() }),
    );

    let caught: unknown;

    try {
      nested.transform({ profile: { email: 'not-an-email' } });
    } catch (error) {
      caught = error;
    }

    expect(Object.keys(bodyOf(caught).errors)).toStrictEqual(['profile.email']);
  });

  it('responds with the shared validation error shape', () => {
    let caught: unknown;

    try {
      pipe.transform({});
    } catch (error) {
      caught = error;
    }

    const body = bodyOf(caught);

    expect(body.statusCode).toBe(400);
    expect(body.message).toBe('Validation failed');
  });

  it('applies schema defaults', () => {
    const withDefault = new JoiValidationPipe(
      Joi.object({ limit: Joi.number().integer().default(10) }),
    );

    expect(withDefault.transform({})).toStrictEqual({ limit: 10 });
  });

  it('rejects a non-object payload against an object schema', () => {
    expect(() => pipe.transform('not an object')).toThrow(BadRequestException);
  });
});
