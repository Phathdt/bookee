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
  CreateStationBodyDto,
  StationDto,
  StationSearchQueryDto,
  UpdateStationBodyDto,
} from './dto/stations.dto';
import { mapStationsDomainError } from './map-domain-error';

import { Roles } from '@/modules/auth/infrastructure/decorators/roles.decorator';
import { JwtAuthGuard } from '@/modules/auth/infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/infrastructure/guards/roles.guard';
import { IStationsService } from '@/modules/stations/domain/interfaces/stations.service';

@ApiTags('stations')
@Controller('stations')
export class StationsController {
  constructor(@Inject(IStationsService) private readonly stations: IStationsService) {}

  // ---- Public read --------------------------------------------------------

  @Get()
  @ApiOperation({ operationId: 'listStations', summary: 'Search stations (public)' })
  @ApiResponse({ status: 200, type: [StationDto] })
  list(@Query() query: StationSearchQueryDto): Promise<StationDto[]> {
    return this.stations.list({ city: query.city, q: query.q });
  }

  @Get(':id')
  @ApiOperation({ operationId: 'getStation', summary: 'Get a single station' })
  @ApiResponse({ status: 200, type: StationDto })
  async getOne(@Param('id', ParseIntPipe) id: number): Promise<StationDto> {
    try {
      return await this.stations.getById(id);
    } catch (err) {
      throw mapStationsDomainError(err);
    }
  }

  // ---- Admin write --------------------------------------------------------

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(['admin'])
  @ApiOperation({ operationId: 'createStation', summary: 'Create a station (admin)' })
  @ApiResponse({ status: 201, type: StationDto })
  async create(@Body() body: CreateStationBodyDto): Promise<StationDto> {
    try {
      return await this.stations.create(body);
    } catch (err) {
      throw mapStationsDomainError(err);
    }
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(['admin'])
  @ApiOperation({ operationId: 'updateStation', summary: 'Update a station (admin)' })
  @ApiResponse({ status: 200, type: StationDto })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateStationBodyDto,
  ): Promise<StationDto> {
    try {
      return await this.stations.update(id, body);
    } catch (err) {
      throw mapStationsDomainError(err);
    }
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(['admin'])
  @ApiOperation({ operationId: 'deleteStation', summary: 'Delete a station (admin)' })
  @ApiResponse({ status: 204 })
  async delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    try {
      await this.stations.delete(id);
    } catch (err) {
      throw mapStationsDomainError(err);
    }
  }
}
