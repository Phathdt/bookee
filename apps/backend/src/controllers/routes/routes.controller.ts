import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import {
  CreateRouteBodyDto,
  RouteDto,
  RouteSearchQueryDto,
  UpdateRouteBodyDto,
} from './dto/routes.dto';
import { mapRoutesDomainError } from './map-domain-error';

import { JwtPayload } from '@/modules/auth/domain/jwt-payload';
import { CurrentUser } from '@/modules/auth/infrastructure/decorators/current-user.decorator';
import { Roles } from '@/modules/auth/infrastructure/decorators/roles.decorator';
import { JwtAuthGuard } from '@/modules/auth/infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/infrastructure/guards/roles.guard';
import { ActorContext, IRoutesService } from '@/modules/routes/domain/interfaces/routes.service';

function toActor(user: JwtPayload): ActorContext {
  // admin (operatorId null) bypasses scope; everyone else is scoped to their op.
  return { actorOperatorId: user.role === 'admin' ? null : user.operatorId };
}

@ApiTags('routes')
@Controller('routes')
export class RoutesController {
  constructor(@Inject(IRoutesService) private readonly routes: IRoutesService) {}

  // ---- Public read --------------------------------------------------------

  @Get()
  @ApiOperation({ operationId: 'listRoutes', summary: 'Search routes (public)' })
  @ApiResponse({ status: 200, type: [RouteDto] })
  list(@Query() query: RouteSearchQueryDto): Promise<RouteDto[]> {
    return this.routes.list({
      companyId: query.companyId,
      fromStationId: query.fromStationId,
      toStationId: query.toStationId,
    });
  }

  @Get(':id')
  @ApiOperation({ operationId: 'getRoute', summary: 'Get a single route' })
  @ApiResponse({ status: 200, type: RouteDto })
  async getOne(@Param('id', ParseIntPipe) id: number): Promise<RouteDto> {
    try {
      return await this.routes.getById(id);
    } catch (err) {
      throw mapRoutesDomainError(err);
    }
  }

  // ---- Operator / admin write ---------------------------------------------

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(['admin', 'operator'])
  @ApiOperation({
    operationId: 'createRoute',
    summary: 'Create a route (admin or operator-scoped)',
  })
  @ApiResponse({ status: 201, type: RouteDto })
  async create(
    @Body() body: CreateRouteBodyDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<RouteDto> {
    try {
      return await this.routes.create(body, toActor(user));
    } catch (err) {
      throw mapRoutesDomainError(err);
    }
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(['admin', 'operator'])
  @ApiOperation({
    operationId: 'updateRoute',
    summary: 'Update a route (admin or owning operator)',
  })
  @ApiResponse({ status: 200, type: RouteDto })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateRouteBodyDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<RouteDto> {
    try {
      return await this.routes.update(id, body, toActor(user));
    } catch (err) {
      throw mapRoutesDomainError(err);
    }
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(['admin', 'operator'])
  @ApiOperation({
    operationId: 'deleteRoute',
    summary: 'Delete a route (admin or owning operator)',
  })
  @ApiResponse({ status: 204 })
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    try {
      await this.routes.delete(id, toActor(user));
    } catch (err) {
      throw mapRoutesDomainError(err);
    }
  }
}
