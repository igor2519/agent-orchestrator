import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MockReceiverController } from './controllers/mock-receiver.controller';
import { ReceivedCallback } from './entities/received-callback.entity';
import { ReceivedCallbacksRepository } from './repositories/received-callbacks.repository';
import { MockReceiverService } from './services/mock-receiver.service';
import { WebhookSignatureService } from './services/webhook-signature.service';

@Module({
  imports: [TypeOrmModule.forFeature([ReceivedCallback])],
  controllers: [MockReceiverController],
  providers: [ReceivedCallbacksRepository, WebhookSignatureService, MockReceiverService],
})
export class MockReceiverModule {}
