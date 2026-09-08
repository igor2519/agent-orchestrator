import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';

import envConfig from 'src/config/env.config';

import type { ConfigType } from '@nestjs/config';

const TICKET_TTL_MS = 60_000;

/**
 * Short-lived tickets authorising a WebSocket connection.
 *
 * A browser's `WebSocket` cannot send an `Authorization` header, and putting the
 * API key in the URL would leak it into history, proxy logs and referrers. Instead
 * the server-side caller (which already holds the key) mints a ticket that is
 * signed, single-purpose and expires in a minute, and the browser presents that.
 *
 * Stateless by design: the signature carries the expiry, so no store is needed and
 * a restart does not invalidate connections mid-flight.
 */
@Injectable()
export class DocumentTicketService {
  constructor(@Inject(envConfig.KEY) private readonly config: ConfigType<typeof envConfig>) {}

  issue(): { ticket: string; expiresAt: string } {
    const expiresAt = Date.now() + TICKET_TTL_MS;
    const nonce = randomUUID();
    const payload = `${nonce}.${expiresAt}`;

    return {
      ticket: `${payload}.${this.sign(payload)}`,
      expiresAt: new Date(expiresAt).toISOString(),
    };
  }

  verify(ticket: string | undefined): boolean {
    if (!ticket) {
      return false;
    }

    const [nonce, expiresAt, signature] = ticket.split('.');

    if (!nonce || !expiresAt || !signature) {
      return false;
    }

    if (Number(expiresAt) < Date.now()) {
      return false;
    }

    const expected = Buffer.from(this.sign(`${nonce}.${expiresAt}`));
    const actual = Buffer.from(signature);

    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }

  private sign(payload: string): string {
    return createHmac('sha256', this.config.webhook.signingSecret).update(payload).digest('hex');
  }
}
