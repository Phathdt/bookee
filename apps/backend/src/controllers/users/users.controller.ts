import { Body, Controller, Get, Inject, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { PublicUserDto, UpdateProfileBodyDto } from './dto/users.dto';
import { mapUsersDomainError } from './map-domain-error';

import { PublicUser } from '@/modules/auth/domain/entities/user.entity';
import { JwtPayload } from '@/modules/auth/domain/jwt-payload';
import { CurrentUser } from '@/modules/auth/infrastructure/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/modules/auth/infrastructure/guards/jwt-auth.guard';
import { IUsersService } from '@/modules/users/domain/interfaces/users.service';

/** Serialize domain User dates to ISO strings for HTTP transport. */
function toPublicUserDto(user: PublicUser): PublicUserDto {
  return {
    ...user,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(@Inject(IUsersService) private readonly users: IUsersService) {}

  @Get('me')
  @ApiOperation({ operationId: 'getMe', summary: 'Return the authenticated user profile' })
  @ApiResponse({ status: 200, type: PublicUserDto })
  async getMe(@CurrentUser() user: JwtPayload): Promise<PublicUserDto> {
    try {
      return toPublicUserDto(await this.users.getMe(user.sub));
    } catch (err) {
      throw mapUsersDomainError(err);
    }
  }

  @Patch('me')
  @ApiOperation({ operationId: 'updateMe', summary: 'Update the authenticated user profile' })
  @ApiResponse({ status: 200, type: PublicUserDto })
  async updateMe(
    @CurrentUser() user: JwtPayload,
    @Body() body: UpdateProfileBodyDto,
  ): Promise<PublicUserDto> {
    try {
      return toPublicUserDto(await this.users.updateMe(user.sub, body));
    } catch (err) {
      throw mapUsersDomainError(err);
    }
  }
}
