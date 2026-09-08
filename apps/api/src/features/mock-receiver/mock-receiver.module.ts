import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MockReceiverController } from './mock-receiver.controller';
import { MockReceiverService } from './mock-receiver.service';
import { ReceivedCallback } from './received-callback.entity';
import { ReceivedCallbacksRepository } from './received-callbacks.repository';
import { WebhookSignatureService } from './webhook-signature.service';

@Module({
  imports: [TypeOrmModule.forFeature([ReceivedCallback])],
  controllers: [MockReceiverController],
  providers: [ReceivedCallbacksRepository, WebhookSignatureService, MockReceiverService],
})
export class MockReceiverModule {}
