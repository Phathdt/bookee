import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import {
  BookingDto,
  BookingWithDetailsDto,
  CreateBookingBodyDto,
  LookupBookingQueryDto,
} from './dto/bookings.dto';
import { mapBookingsDomainError } from './map-domain-error';

import type { JwtPayload } from '@/modules/auth/domain/jwt-payload';
import { Roles } from '@/modules/auth/infrastructure/decorators/roles.decorator';
import { JwtAuthGuard } from '@/modules/auth/infrastructure/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '@/modules/auth/infrastructure/guards/optional-jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/infrastructure/guards/roles.guard';
import { Booking, BookingWithDetails } from '@/modules/bookings/domain/entities/booking.entity';
import { IBookingsService } from '@/modules/bookings/domain/interfaces/bookings.service';

type RequestWithUser = { user?: JwtPayload };

function toBookingWithDetailsDto(b: BookingWithDetails): BookingWithDetailsDto {
  return {
    id: b.id,
    bookingCode: b.bookingCode,
    userId: b.userId,
    tripId: b.tripId,
    totalAmount: b.totalAmount,
    status: b.status,
    couponId: b.couponId,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
    seats: b.seats.map((s) => ({
      id: s.id,
      bookingId: s.bookingId,
      seatId: s.seatId,
      price: s.price,
    })),
    passengers: b.passengers.map((p) => ({
      id: p.id,
      bookingId: p.bookingId,
      fullName: p.fullName,
      phone: p.phone,
      // idCardEncrypted in domain holds the masked value after service processing
      idCardMasked: p.idCardEncrypted,
    })),
  };
}

function toBookingDto(b: Booking): BookingDto {
  return {
    id: b.id,
    bookingCode: b.bookingCode,
    userId: b.userId,
    tripId: b.tripId,
    totalAmount: b.totalAmount,
    status: b.status,
    couponId: b.couponId,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  };
}

@ApiTags('bookings')
@Controller('bookings')
export class BookingsController {
  constructor(@Inject(IBookingsService) private readonly bookings: IBookingsService) {}

  // ── POST /bookings (auth optional — guests allowed) ──────────────────────

  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    operationId: 'createBooking',
    summary: 'Create a booking (guest or authenticated)',
  })
  @ApiResponse({ status: 201, type: BookingWithDetailsDto })
  async create(
    @Body() body: CreateBookingBodyDto,
    @Request() req: RequestWithUser,
  ): Promise<BookingWithDetailsDto> {
    try {
      const userId = req.user?.sub ?? null;
      const booking = await this.bookings.create(
        {
          tripId: body.tripId,
          seatIds: body.seatIds,
          passengers: body.passengers,
          couponCode: body.couponCode,
        },
        { userId },
      );
      return toBookingWithDetailsDto(booking);
    } catch (err) {
      throw mapBookingsDomainError(err);
    }
  }

  // ── GET /bookings/me (authenticated customer) ─────────────────────────────

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(['customer'])
  @ApiOperation({ operationId: 'listMyBookings', summary: 'List current user bookings' })
  @ApiResponse({ status: 200, type: [BookingDto] })
  async listMine(@Request() req: RequestWithUser): Promise<BookingDto[]> {
    try {
      const userId = req.user!.sub;
      const bookings = await this.bookings.listByUser(userId);
      return bookings.map(toBookingDto);
    } catch (err) {
      throw mapBookingsDomainError(err);
    }
  }

  // ── GET /bookings/lookup (public) ─────────────────────────────────────────

  @Get('lookup')
  @ApiOperation({
    operationId: 'lookupBooking',
    summary: 'Look up booking by code + phone (public)',
  })
  @ApiResponse({ status: 200, type: BookingWithDetailsDto })
  async lookup(@Query() query: LookupBookingQueryDto): Promise<BookingWithDetailsDto> {
    try {
      const booking = await this.bookings.lookup(query.code, query.phone);
      return toBookingWithDetailsDto(booking);
    } catch (err) {
      throw mapBookingsDomainError(err);
    }
  }

  // ── POST /bookings/:id/cancel ─────────────────────────────────────────────

  @Post(':id/cancel')
  @HttpCode(200)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(['customer', 'admin'])
  @ApiOperation({ operationId: 'cancelBooking', summary: 'Cancel a pending booking' })
  @ApiResponse({ status: 200 })
  async cancel(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: RequestWithUser,
  ): Promise<void> {
    try {
      const userId = req.user!.sub;
      const role = req.user!.role;
      await this.bookings.cancel(id, { userId, role });
    } catch (err) {
      throw mapBookingsDomainError(err);
    }
  }
}
