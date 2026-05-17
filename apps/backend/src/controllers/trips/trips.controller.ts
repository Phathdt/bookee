import {
  Body,
  Controller,
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
  BulkCreateTripsBodyDto,
  CreateTripBodyDto,
  SetTripStatusBodyDto,
  TripDto,
  TripSearchQueryDto,
} from './dto/trips.dto';
import {
  TripSearchQueryDto as TripPublicSearchQueryDto,
  TripSearchPageDto,
} from './dto/trip-search.dto';
import { mapTripsDomainError } from './map-domain-error';

import type { JwtPayload } from '@/modules/auth/domain/jwt-payload';
import { CurrentUser } from '@/modules/auth/infrastructure/decorators/current-user.decorator';
import { Roles } from '@/modules/auth/infrastructure/decorators/roles.decorator';
import { JwtAuthGuard } from '@/modules/auth/infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/infrastructure/guards/roles.guard';
import { TripSearchResult } from '@/modules/trips/domain/entities/trip-search-result.entity';
import { ActorContext, ITripsService } from '@/modules/trips/domain/interfaces/trips.service';

function toActor(user: JwtPayload): ActorContext {
  return { actorOperatorId: user.role === 'admin' ? null : user.operatorId };
}

function toTripDto(trip: {
  id: number;
  routeId: number;
  vehicleId: number;
  departureTime: Date;
  arrivalTime: Date;
  basePrice: number;
  status: string;
}): TripDto {
  return {
    id: trip.id,
    routeId: trip.routeId,
    vehicleId: trip.vehicleId,
    departureTime: trip.departureTime.toISOString(),
    arrivalTime: trip.arrivalTime.toISOString(),
    basePrice: trip.basePrice,
    status: trip.status as TripDto['status'],
  };
}

function toSearchResultDto(r: TripSearchResult): TripSearchPageDto['items'][number] {
  return {
    trip: {
      id: r.trip.id,
      departureTime: r.trip.departureTime.toISOString(),
      arrivalTime: r.trip.arrivalTime.toISOString(),
      basePrice: r.trip.basePrice,
      status: r.trip.status,
    },
    route: {
      id: r.route.id,
      distanceKm: r.route.distanceKm,
      durationMinutes: r.route.durationMinutes,
      fromStation: r.route.fromStation,
      toStation: r.route.toStation,
      company: r.route.company,
    },
    vehicle: r.vehicle,
    availableSeats: r.availableSeats,
  };
}

@ApiTags('trips')
@Controller('trips')
export class TripsController {
  constructor(@Inject(ITripsService) private readonly trips: ITripsService) {}

  // ---- Public read --------------------------------------------------------

  @Get()
  @ApiOperation({ operationId: 'listTrips', summary: 'Search trips (public)' })
  @ApiResponse({ status: 200, type: [TripDto] })
  async list(@Query() query: TripSearchQueryDto): Promise<TripDto[]> {
    const trips = await this.trips.list({
      companyId: query.companyId,
      vehicleId: query.vehicleId,
      routeId: query.routeId,
      status: query.status,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    });
    return trips.map(toTripDto);
  }

  @Get('search')
  @ApiOperation({
    operationId: 'searchTrips',
    summary: 'Search trips by city, date and optional filters (public, cursor-paginated)',
  })
  @ApiResponse({ status: 200, type: TripSearchPageDto })
  async search(@Query() query: TripPublicSearchQueryDto): Promise<TripSearchPageDto> {
    try {
      const page = await this.trips.search({
        from: query.from,
        to: query.to,
        date: query.date,
        operatorIds: query.operatorId,
        vehicleType: query.vehicleType,
        priceMin: query.priceMin,
        priceMax: query.priceMax,
        sort: query.sort,
        limit: query.limit,
        cursor: query.cursor,
      });
      return {
        items: page.items.map(toSearchResultDto),
        nextCursor: page.nextCursor,
      };
    } catch (err) {
      throw mapTripsDomainError(err);
    }
  }

  @Get(':id')
  @ApiOperation({ operationId: 'getTrip', summary: 'Get a single trip (public)' })
  @ApiResponse({ status: 200, type: TripDto })
  async getOne(@Param('id', ParseIntPipe) id: number): Promise<TripDto> {
    try {
      const trip = await this.trips.getById(id);
      return toTripDto(trip);
    } catch (err) {
      throw mapTripsDomainError(err);
    }
  }

  // ---- Operator / admin write ---------------------------------------------

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(['admin', 'operator'])
  @ApiOperation({
    operationId: 'createTrip',
    summary: 'Create a trip (admin or operator-scoped)',
  })
  @ApiResponse({ status: 201, type: TripDto })
  async create(@Body() body: CreateTripBodyDto, @CurrentUser() user: JwtPayload): Promise<TripDto> {
    try {
      const trip = await this.trips.create(
        {
          routeId: body.routeId,
          vehicleId: body.vehicleId,
          departureTime: new Date(body.departureTime),
          arrivalTime: new Date(body.arrivalTime),
          basePrice: body.basePrice,
        },
        toActor(user),
      );
      return toTripDto(trip);
    } catch (err) {
      throw mapTripsDomainError(err);
    }
  }

  @Post('bulk')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(['admin', 'operator'])
  @ApiOperation({
    operationId: 'bulkCreateTrips',
    summary: 'Bulk-create trips from a date range (admin or operator-scoped)',
  })
  @ApiResponse({ status: 201, type: [TripDto] })
  async createBulk(
    @Body() body: BulkCreateTripsBodyDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<TripDto[]> {
    try {
      const trips = await this.trips.createBulk(
        {
          routeId: body.routeId,
          vehicleId: body.vehicleId,
          basePrice: body.basePrice,
          dateRange: body.dateRange,
          dailyDepartureTime: body.dailyDepartureTime,
          tripDurationMinutes: body.tripDurationMinutes,
        },
        toActor(user),
      );
      return trips.map(toTripDto);
    } catch (err) {
      throw mapTripsDomainError(err);
    }
  }

  @Patch(':id/status')
  @HttpCode(200)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(['admin', 'operator'])
  @ApiOperation({
    operationId: 'setTripStatus',
    summary: 'Transition trip status via state machine (admin or operator-scoped)',
  })
  @ApiResponse({ status: 200, type: TripDto })
  async setStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: SetTripStatusBodyDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<TripDto> {
    try {
      const trip = await this.trips.setStatus(id, body.status, toActor(user));
      return toTripDto(trip);
    } catch (err) {
      throw mapTripsDomainError(err);
    }
  }
}
