import { DocumentTicketService } from './document-ticket.service';

const config = { webhook: { signingSecret: 'test-secret' } } as never;

describe('DocumentTicketService', () => {
  const service = new DocumentTicketService(config);

  it('issues a ticket that verifies', () => {
    const { ticket } = service.issue();

    expect(service.verify(ticket)).toBe(true);
  });

  it('reports an expiry in the future', () => {
    const { expiresAt } = service.issue();

    expect(new Date(expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it('issues a distinct ticket each time', () => {
    expect(service.issue().ticket).not.toBe(service.issue().ticket);
  });

  it('rejects a missing or malformed ticket', () => {
    expect(service.verify(undefined)).toBe(false);
    expect(service.verify('')).toBe(false);
    expect(service.verify('not-a-ticket')).toBe(false);
    expect(service.verify('a.b')).toBe(false);
  });

  it('rejects a tampered signature', () => {
    const { ticket } = service.issue();
    const [nonce, expiresAt] = ticket.split('.');

    expect(service.verify(`${nonce}.${expiresAt}.deadbeef`)).toBe(false);
  });

  it('rejects a ticket whose expiry was extended, because the expiry is signed', () => {
    const { ticket } = service.issue();
    const [nonce, , signature] = ticket.split('.');
    const later = Date.now() + 60 * 60_000;

    expect(service.verify(`${nonce}.${later}.${signature}`)).toBe(false);
  });

  it('rejects an expired ticket', () => {
    const expired = Date.now() - 1_000;
    const [nonce] = service.issue().ticket.split('.');

    expect(service.verify(`${nonce}.${expired}.whatever`)).toBe(false);
  });

  it('rejects a ticket signed with a different secret', () => {
    const other = new DocumentTicketService({
      webhook: { signingSecret: 'other-secret' },
    } as never);

    expect(service.verify(other.issue().ticket)).toBe(false);
  });
});
