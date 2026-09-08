import { BaseLogger } from '@app/logger';
import { Inject, Injectable, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';

import envConfig from '../config/env.config';

import { NotificationDeliveryService } from './notification-delivery.service';

import type { ConfigType } from '@nestjs/config';

/**
 * Decides *when* queued notifications are attempted.
 *
 * Timing is kept apart from delivery so the same logic can be driven by this
 * timer, a test, or a manual replay without either concern knowing about the
 * others. It holds no knowledge of channels at all.
 */
@Injectable()
export class DeliveryScheduler implements OnApplicationBootstrap, OnApplicationShutdown {
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly deliveries: NotificationDeliveryService,
    private readonly logger: BaseLogger,
    @Inject(envConfig.KEY) private readonly config: ConfigType<typeof envConfig>,
  ) {}

  onApplicationBootstrap(): void {
    this.timer = setInterval(() => {
      void this.tick();
    }, this.config.webhook.pollIntervalMs);
    // Never hold the event loop open purely for the poll during shutdown.
    this.timer.unref();
  }

  onApplicationShutdown(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  /** Exposed so a test can drive one pass without waiting for the timer. */
  async tick(): Promise<number> {
    if (this.running) {
      return 0;
    }

    this.running = true;

    try {
      const due = await this.deliveries.claimDue(this.config.webhook.batchSize);

      for (const delivery of due) {
        await this.deliveries.attempt(delivery);
      }

      return due.length;
    } catch (error) {
      this.logger.error('Delivery scheduler tick failed', error);

      return 0;
    } finally {
      this.running = false;
    }
  }
}
