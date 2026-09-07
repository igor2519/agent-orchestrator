import { ApiProperty } from '@nestjs/swagger';

export class SignInDto {
  @ApiProperty({ example: 'admin@test.com' })
  email: string;
  @ApiProperty({ example: 'Test1234' })
  password: string;
}
