export { AuthModule } from './auth.module';

// Domain entity + enums
export { USER_ROLES, isUserRole, type UserRole } from './domain/enums';
export type { JwtPayload } from './domain/jwt-payload';
export type { User, PublicUser } from './domain/entities/user.entity';
export { toPublicUser } from './domain/entities/user.entity';

// Service ports (DI tokens + types)
export { IAuthService } from './domain/interfaces/auth.service';
export type {
  AuthSession,
  AuthTokens,
  LoginInput,
  RegisterInput,
} from './domain/interfaces/auth.service';
export { IUserRepository } from './domain/interfaces/user.repository';
export type { CreateUserInput } from './domain/interfaces/user.repository';

// Application service class + domain errors
export { AuthService } from './application/services/auth.service';
export { AuthConflictError, AuthUnauthorizedError } from './domain/errors';

// HTTP-layer helpers
export { JwtAuthGuard } from './infrastructure/guards/jwt-auth.guard';
export { RolesGuard } from './infrastructure/guards/roles.guard';
export { Roles } from './infrastructure/decorators/roles.decorator';
export { CurrentUser } from './infrastructure/decorators/current-user.decorator';
