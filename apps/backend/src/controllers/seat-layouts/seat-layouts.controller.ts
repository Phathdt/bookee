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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import {
  CreateSeatLayoutBodyDto,
  SeatLayoutDto,
  UpdateSeatLayoutBodyDto,
} from './dto/seat-layouts.dto';
import { mapSeatLayoutsDomainError } from './map-domain-error';

import { Roles } from '@/modules/auth/infrastructure/decorators/roles.decorator';
import { JwtAuthGuard } from '@/modules/auth/infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/infrastructure/guards/roles.guard';
import { ISeatLayoutsService } from '@/modules/seat-layouts/domain/interfaces/seat-layouts.service';

@ApiTags('seat-layouts')
@Controller('seat-layouts')
export class SeatLayoutsController {
  constructor(@Inject(ISeatLayoutsService) private readonly seatLayouts: ISeatLayoutsService) {}

  // ---- Public read --------------------------------------------------------

  @Get()
  @ApiOperation({ operationId: 'listSeatLayouts', summary: 'List all seat layouts (public)' })
  @ApiResponse({ status: 200, type: [SeatLayoutDto] })
  list(): Promise<SeatLayoutDto[]> {
    return this.seatLayouts.list();
  }

  @Get(':id')
  @ApiOperation({ operationId: 'getSeatLayout', summary: 'Get a seat layout with seats (public)' })
  @ApiResponse({ status: 200, type: SeatLayoutDto })
  async getOne(@Param('id', ParseIntPipe) id: number): Promise<SeatLayoutDto> {
    try {
      return await this.seatLayouts.getById(id);
    } catch (err) {
      throw mapSeatLayoutsDomainError(err);
    }
  }

  // ---- Admin write --------------------------------------------------------

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(['admin'])
  @ApiOperation({
    operationId: 'createSeatLayout',
    summary: 'Create a seat layout with seats in one transaction (admin)',
  })
  @ApiResponse({ status: 201, type: SeatLayoutDto })
  async create(@Body() body: CreateSeatLayoutBodyDto): Promise<SeatLayoutDto> {
    try {
      return await this.seatLayouts.create(body);
    } catch (err) {
      throw mapSeatLayoutsDomainError(err);
    }
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(['admin'])
  @ApiOperation({
    operationId: 'updateSeatLayout',
    summary: 'Update seat layout metadata (admin)',
  })
  @ApiResponse({ status: 200, type: SeatLayoutDto })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateSeatLayoutBodyDto,
  ): Promise<SeatLayoutDto> {
    try {
      return await this.seatLayouts.update(id, body);
    } catch (err) {
      throw mapSeatLayoutsDomainError(err);
    }
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(['admin'])
  @ApiOperation({
    operationId: 'deleteSeatLayout',
    summary: 'Delete a seat layout (admin) — 409 if vehicles reference it',
  })
  @ApiResponse({ status: 204 })
  async delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    try {
      await this.seatLayouts.delete(id);
    } catch (err) {
      throw mapSeatLayoutsDomainError(err);
    }
  }
}
