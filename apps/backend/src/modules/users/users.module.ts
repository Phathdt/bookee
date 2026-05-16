import { Module } from '@nestjs/common';

import { UsersService } from './application/services/users.service';
import { IUsersService } from './domain/interfaces/users.service';

import { AuthModule } from '@/modules/auth/auth.module';
import { IUserRepository } from '@/modules/auth/domain/interfaces/user.repository';

@Module({
  imports: [AuthModule],
  providers: [
    {
      provide: IUsersService,
      useFactory: (users: IUserRepository) => new UsersService(users),
      inject: [IUserRepository],
    },
  ],
  exports: [IUsersService],
})
export class UsersModule {}
