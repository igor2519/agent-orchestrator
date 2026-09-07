import { Test, TestingModule } from '@nestjs/testing';

import { mockFactory } from 'test/mocks';

import { UsersController } from './users.controller';

describe('UsersController', () => {
  let controller: UsersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
    })
      .useMocker(mockFactory)
      .compile();

    // UsersController inherits transient scope from the file-upload pipe, and
    // Nest requires resolve() rather than get() for scoped providers
    controller = await module.resolve<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
