import { randomUUID } from 'node:crypto';

import { RequestContext } from '@app/logger';
import { Injectable } from '@nestjs/common';

import type { NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

export const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Establishes the request id for the lifetime of one HTTP call.
 *
 * An inbound `x-request-id` is honoured so a caller's own tracing id survives into
 * our logs and, from there, onto every event the request produces. The id is echoed
 * back on the response, which is what lets a customer quote it when reporting a
 * problem.
 */
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction): void {
    const inbound = request.header(REQUEST_ID_HEADER);
    const requestId = RequestContextMiddleware.sanitize(inbound) ?? randomUUID();

    response.setHeader(REQUEST_ID_HEADER, requestId);

    RequestContext.run({ requestId }, () => {
      next();
    });
  }

  /**
   * A caller-supplied id is untrusted input that ends up in log files, so it is
   * length-capped and restricted to characters that cannot forge a log line.
   */
  private static sanitize(value: string | undefined): string | undefined {
    if (!value) {
      return undefined;
    }

    const trimmed = value.trim().slice(0, 64);

    return /^[\w.:-]+$/u.test(trimmed) ? trimmed : undefined;
  }
}
