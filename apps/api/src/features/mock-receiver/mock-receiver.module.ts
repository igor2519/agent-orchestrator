import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MockReceiverController } from './mock-receiver.controller';
import { ReceivedCallback } from './received-callback.entity';
import { WebhookSignatureService } from './webhook-signature.service';

@Module({
  imports: [TypeOrmModule.forFeature([ReceivedCallback])],
  controllers: [MockReceiverController],
  providers: [WebhookSignatureService],
})
export class MockReceiverModule {}
