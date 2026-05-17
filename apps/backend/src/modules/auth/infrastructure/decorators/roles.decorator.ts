import { Reflector } from '@nestjs/core';

import { UserRole } from '../../domain/enums';

/**
 * Declarative role gate. Usage:
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 *   @Roles('admin', 'operator')
 *   @Get(...)
 */
export const Roles = Reflector.createDecorator<UserRole[]>();
