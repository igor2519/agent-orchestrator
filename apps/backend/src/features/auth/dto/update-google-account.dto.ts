import { PartialType, PickType } from '@nestjs/swagger';

import { User } from 'src/features/users/entities/user.entity';

export class UpdateGoogleAccountDto extends PartialType(
  PickType(User, ['googleAccountId', 'imageUri', 'isEmailVerified']),
) {}
