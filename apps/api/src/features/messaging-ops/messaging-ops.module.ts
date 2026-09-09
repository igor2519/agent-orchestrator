import { Module } from '@nestjs/common';

import { MessagingOpsController } from './controllers/messaging-ops.controller';

/** MessagingOpsService is provided by the globally-registered MessagingModule. */
@Module({
  controllers: [MessagingOpsController],
})
export class MessagingOpsModule {}
