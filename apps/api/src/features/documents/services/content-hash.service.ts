import { createHash } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import type { SubmitDocumentInput } from '../joi-validations';

/**
 * Derives a stable content fingerprint for a submitted document.
 *
 * This is what makes "process each file once" possible: two submissions with the
 * same content produce the same hash regardless of how the JSON was ordered or
 * which reference the customer attached to it.
 *
 * Deliberately distinct from the request fingerprint used for `Idempotency-Key`:
 * that one covers the whole request (including the callback URL and reference) and
 * exists to make a retried HTTP call safe. This one covers the *file* only, so the
 * same content submitted under a new reference is still recognised as processed.
 */
@Injectable()
export class ContentHashService {
  hash(input: Pick<SubmitDocumentInput, 'payload' | 'payloadUri'>): string {
    const canonical =
      input.payload === undefined
        ? `uri:${input.payloadUri ?? ''}`
        : `json:${ContentHashService.canonicalize(input.payload)}`;

    return createHash('sha256').update(canonical).digest('hex');
  }

  /**
   * Key order must not change the hash, so objects are serialised with their keys
   * sorted, recursively. Arrays keep their order because it is meaningful.
   */
  private static canonicalize(value: unknown): string {
    if (value === null || typeof value !== 'object') {
      return JSON.stringify(value) ?? 'null';
    }

    if (Array.isArray(value)) {
      return `[${value.map((item) => ContentHashService.canonicalize(item)).join(',')}]`;
    }

    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${ContentHashService.canonicalize(item)}`);

    return `{${entries.join(',')}}`;
  }
}
