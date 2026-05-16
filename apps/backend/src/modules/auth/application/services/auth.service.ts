import { toPublicUser, type User } from '../../domain/entities/user.entity';
import type {
  AuthSession,
  AuthTokens,
  IAuthService,
  LoginInput,
  RegisterInput,
} from '../../domain/interfaces/auth.service';
import type { IJwtSigner } from '../../domain/interfaces/jwt-signer';
import type { IUserRepository } from '../../domain/interfaces/user.repository';
import { PasswordHash } from '../../domain/password-hash';

const ACCESS_TOKEN_TTL = '1d';
const REFRESH_TOKEN_TTL = '7d';

// Framework-agnostic: no @Injectable / @Inject. NestJS DI wires this via
// useFactory in auth.module.ts.
export class AuthService implements IAuthService {
  constructor(
    private readonly users: IUserRepository,
    private readonly jwt: IJwtSigner,
  ) {}

  async register(input: RegisterInput): Promise<AuthSession> {
    if (await this.users.findByEmail(input.email)) {
      throw new AuthService.ConflictError('email already registered');
    }
    if (await this.users.findByPhone(input.phone)) {
      throw new AuthService.ConflictError('phone already registered');
    }

    const passwordHash = await PasswordHash.fromPlain(input.password);
    const user = await this.users.create({
      name: input.name,
      phone: input.phone,
      email: input.email,
      passwordHash: passwordHash.value,
      role: 'customer',
    });

    return this.buildSession(user);
  }

  async login(input: LoginInput): Promise<AuthSession> {
    const user = await this.users.findByPhoneOrEmail(input.identifier);
    if (!user) throw new AuthService.UnauthorizedError('Invalid credentials');

    const stored = PasswordHash.fromStored(user.passwordHash);
    if (!(await stored.matches(input.password))) {
      throw new AuthService.UnauthorizedError('Invalid credentials');
    }

    return this.buildSession(user);
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload;
    try {
      payload = await this.jwt.verify(refreshToken);
    } catch {
      throw new AuthService.UnauthorizedError('Invalid refresh token');
    }
    if (payload.typ !== 'refresh') {
      throw new AuthService.UnauthorizedError('Token is not a refresh token');
    }

    const user = await this.users.findById(payload.sub);
    if (!user) throw new AuthService.UnauthorizedError('User no longer exists');

    return this.signTokens(user);
  }

  // Domain-level errors — infrastructure layer maps these to HTTP exceptions.
  static readonly ConflictError = class extends Error {
    readonly kind = 'conflict' as const;
  };
  static readonly UnauthorizedError = class extends Error {
    readonly kind = 'unauthorized' as const;
  };

  private async buildSession(user: User): Promise<AuthSession> {
    const tokens = await this.signTokens(user);
    return { user: toPublicUser(user), tokens };
  }

  private async signTokens(user: User): Promise<AuthTokens> {
    const base = { sub: user.id, role: user.role, operatorId: user.operatorId } as const;
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.sign({ ...base, typ: 'access' }, { expiresIn: ACCESS_TOKEN_TTL }),
      this.jwt.sign({ ...base, typ: 'refresh' }, { expiresIn: REFRESH_TOKEN_TTL }),
    ]);
    return { accessToken, refreshToken };
  }
}
