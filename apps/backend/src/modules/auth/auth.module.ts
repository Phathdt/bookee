import { Module } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AuthService } from './application/services/auth.service';
import { IAuthService } from './domain/interfaces/auth.service';
import { IJwtSigner } from './domain/interfaces/jwt-signer';
import { IUserRepository } from './domain/interfaces/user.repository';
import { JwtSignerNest } from './infrastructure/jwt-signer.nest';
import { UserRepositoryPrisma } from './infrastructure/repositories/user.repository.prisma';
import { JwtStrategy } from './infrastructure/strategies/jwt.strategy';

import { DatabaseService } from '@/modules/database/database.service';

/**
 * Auth module composition.
 *
 * Domain ports (abstract classes) act as DI tokens. Implementations are
 * wired via useFactory so domain/application stay framework-agnostic
 * (no @Injectable / @Inject decorators in those layers).
 */
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET ?? 'dev-secret',
      }),
    }),
  ],
  providers: [
    JwtStrategy,
    {
      provide: IUserRepository,
      useFactory: (db: DatabaseService) => new UserRepositoryPrisma(db),
      inject: [DatabaseService],
    },
    {
      provide: IJwtSigner,
      useFactory: (jwt: JwtService) => new JwtSignerNest(jwt),
      inject: [JwtService],
    },
    {
      provide: IAuthService,
      useFactory: (users: IUserRepository, jwt: IJwtSigner) => new AuthService(users, jwt),
      inject: [IUserRepository, IJwtSigner],
    },
  ],
  exports: [IAuthService, IUserRepository],
})
export class AuthModule {}
