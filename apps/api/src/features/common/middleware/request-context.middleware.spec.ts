import { RequestContext } from '@app/logger';
import { describe, it, expect } from '@jest/globals';

import { RequestContextMiddleware } from './request-context.middleware';

import type { NextFunction, Request, Response } from 'express';

const run = (headerValue?: string) => {
  const middleware = new RequestContextMiddleware();
  const headers: Record<string, string> = {};
  let seen: string | undefined;

  const request = { header: () => headerValue } as unknown as Request;
  const response = {
    setHeader: (name: string, value: string) => {
      headers[name] = value;
    },
  } as unknown as Response;
  const next: NextFunction = () => {
    seen = RequestContext.requestId;
  };

  middleware.use(request, response, next);

  return { headers, seen };
};

describe('RequestContextMiddleware', () => {
  it('generates a request id when the caller supplies none', () => {
    const { seen } = run();

    expect(seen).toMatch(/^[0-9a-f-]{36}$/u);
  });

  it("honours the caller's own tracing id", () => {
    expect(run('caller-request-42').seen).toBe('caller-request-42');
  });

  it('echoes the id back so a client can quote it', () => {
    const { headers, seen } = run('caller-request-42');

    expect(headers['x-request-id']).toBe(seen);
  });

  it('rejects an id with characters that could forge a log line', () => {
    // Falls back to a generated id rather than trusting the input.
    expect(run('bad id\nlevel=error').seen).not.toBe('bad id\nlevel=error');
  });

  it('caps an over-long id instead of letting it bloat every log record', () => {
    const { seen } = run('x'.repeat(200));

    expect(seen).toHaveLength(64);
  });

  it('makes the id visible to code running inside the request', () => {
    expect(run('abc').seen).toBe('abc');
  });

  it('does not leak the context outside the request', () => {
    run('abc');

    expect(RequestContext.requestId).toBeUndefined();
  });
});
