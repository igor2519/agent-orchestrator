import { BaseLogger } from '@app/logger';
import { Injectable } from '@nestjs/common';
import { OnGatewayConnection, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';

import { DocumentTicketService } from './services/document-ticket.service';

import type { DocumentStatusEvent } from './services/document-stream.service';
import type { IncomingMessage } from 'node:http';
import type { Server, WebSocket } from 'ws';

/**
 * Pushes document milestones to connected browsers.
 *
 * This is the API end of the notification service's websocket channel: that
 * service publishes a broadcast event, the API consumes it, and this gateway
 * relays it to every open socket.
 *
 * Connections are authorised with a short-lived ticket rather than the API key,
 * because a browser cannot set headers on a WebSocket handshake.
 */
@Injectable()
@WebSocketGateway({ path: '/ws/documents' })
export class DocumentsGateway implements OnGatewayConnection {
  @WebSocketServer()
  private server?: Server;

  constructor(
    private readonly tickets: DocumentTicketService,
    private readonly logger: BaseLogger,
  ) {}

  handleConnection(client: WebSocket, request: IncomingMessage): void {
    const ticket = new URL(request.url ?? '', 'http://localhost').searchParams.get('ticket');

    if (!this.tickets.verify(ticket ?? undefined)) {
      this.logger.warn('Rejected WebSocket connection with an invalid ticket');
      // 1008 = policy violation.
      client.close(1008, 'Invalid or expired ticket');

      return;
    }

    this.logger.log('WebSocket client connected');
  }

  /** Fan-out to every open socket. Best-effort: a slow client is skipped, not queued. */
  broadcast(event: DocumentStatusEvent & { channel?: string }): void {
    if (!this.server) {
      return;
    }

    const message = JSON.stringify(event);

    for (const client of this.server.clients) {
      // 1 === WebSocket.OPEN; a closing socket must not be written to.
      if (client.readyState === 1) {
        client.send(message);
      }
    }
  }
}
