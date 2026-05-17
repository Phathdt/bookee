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
  CreateVehicleBodyDto,
  UpdateVehicleBodyDto,
  VehicleDto,
  VehicleSearchQueryDto,
} from './dto/vehicles.dto';
import { mapVehiclesDomainError } from './map-domain-error';

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import type { JwtPayload } from '@/modules/auth/domain/jwt-payload';
import { CurrentUser } from '@/modules/auth/infrastructure/decorators/current-user.decorator';
import { Roles } from '@/modules/auth/infrastructure/decorators/roles.decorator';
import { JwtAuthGuard } from '@/modules/auth/infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/infrastructure/guards/roles.guard';
import {
  ActorContext,
  IVehiclesService,
} from '@/modules/vehicles/domain/interfaces/vehicles.service';

function toActor(user: JwtPayload): ActorContext {
  return { actorOperatorId: user.role === 'admin' ? null : user.operatorId };
}

@ApiTags('vehicles')
@Controller('vehicles')
export class VehiclesController {
  constructor(@Inject(IVehiclesService) private readonly vehicles: IVehiclesService) {}

  // ---- Public read --------------------------------------------------------

  @Get()
  @ApiOperation({ operationId: 'listVehicles', summary: 'Search vehicles (public)' })
  @ApiResponse({ status: 200, type: [VehicleDto] })
  list(@Query() query: VehicleSearchQueryDto): Promise<VehicleDto[]> {
    return this.vehicles.list({ companyId: query.companyId, type: query.type });
  }

  @Get(':id')
  @ApiOperation({ operationId: 'getVehicle', summary: 'Get a single vehicle (public)' })
  @ApiResponse({ status: 200, type: VehicleDto })
  async getOne(@Param('id', ParseIntPipe) id: number): Promise<VehicleDto> {
    try {
      return await this.vehicles.getById(id);
    } catch (err) {
      throw mapVehiclesDomainError(err);
    }
  }

  // ---- Operator / admin write ---------------------------------------------

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(['admin', 'operator'])
  @ApiOperation({
    operationId: 'createVehicle',
    summary: 'Create a vehicle (admin or operator-scoped)',
  })
  @ApiResponse({ status: 201, type: VehicleDto })
  async create(
    @Body() body: CreateVehicleBodyDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<VehicleDto> {
    try {
      return await this.vehicles.create(body, toActor(user));
    } catch (err) {
      throw mapVehiclesDomainError(err);
    }
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(['admin', 'operator'])
  @ApiOperation({
    operationId: 'updateVehicle',
    summary: 'Update a vehicle (admin or owning operator)',
  })
  @ApiResponse({ status: 200, type: VehicleDto })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateVehicleBodyDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<VehicleDto> {
    try {
      return await this.vehicles.update(id, body, toActor(user));
    } catch (err) {
      throw mapVehiclesDomainError(err);
    }
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(['admin', 'operator'])
  @ApiOperation({
    operationId: 'deleteVehicle',
    summary: 'Delete a vehicle (admin or owning operator) — 409 if active trips exist',
  })
  @ApiResponse({ status: 204 })
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    try {
      await this.vehicles.delete(id, toActor(user));
    } catch (err) {
      throw mapVehiclesDomainError(err);
    }
  }
}
