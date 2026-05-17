import { Body, Controller, Inject, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import {
  AuthSessionDto,
  AuthTokensDto,
  LoginBodyDto,
  RefreshBodyDto,
  RegisterBodyDto,
} from './dto/auth.dto';
import { mapAuthDomainError } from './map-domain-error';

import { IAuthService } from '@/modules/auth/domain/interfaces/auth.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(@Inject(IAuthService) private readonly auth: IAuthService) {}

  @Post('register')
  @ApiOperation({ operationId: 'registerUser', summary: 'Create a new customer account' })
  @ApiResponse({ status: 201, type: AuthSessionDto })
  async register(@Body() body: RegisterBodyDto): Promise<AuthSessionDto> {
    try {
      return await this.auth.register(body);
    } catch (err) {
      throw mapAuthDomainError(err);
    }
  }

  // Rate limit: 5 attempts / 15 minutes per IP, per the spec for credential
  // stuffing protection. ThrottlerModule wires the storage backend.
  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 15 * 60 * 1000 } })
  @ApiOperation({ operationId: 'loginUser', summary: 'Authenticate by phone/email + password' })
  @ApiResponse({ status: 200, type: AuthSessionDto })
  async login(@Body() body: LoginBodyDto): Promise<AuthSessionDto> {
    try {
      return await this.auth.login(body);
    } catch (err) {
      throw mapAuthDomainError(err);
    }
  }

  @Post('refresh')
  @ApiOperation({ operationId: 'refreshTokens', summary: 'Exchange refresh token for new pair' })
  @ApiResponse({ status: 200, type: AuthTokensDto })
  async refresh(@Body() body: RefreshBodyDto): Promise<AuthTokensDto> {
    try {
      return await this.auth.refresh(body.refreshToken);
    } catch (err) {
      throw mapAuthDomainError(err);
    }
  }
}
