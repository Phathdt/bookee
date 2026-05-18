import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseIntPipe,
  Post,
  Req,
  Request,
  UseGuards,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request as ExpressRequest } from 'express';

import { Roles } from '@/modules/auth/infrastructure/decorators/roles.decorator';
import { JwtAuthGuard } from '@/modules/auth/infrastructure/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '@/modules/auth/infrastructure/guards/optional-jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/infrastructure/guards/roles.guard';
import type { JwtPayload } from '@/modules/auth/domain/jwt-payload';
import { IPaymentsService } from '@/modules/payments/domain/interfaces/payments.service';
import { Payment } from '@/modules/payments/domain/entities/payment.entity';

import {
  CreatePaymentBodyDto,
  CreatePaymentResponseDto,
  PaymentDto,
  PaymentManualConfirmBodyDto,
} from './dto/payments.dto';
import { mapPaymentsDomainError } from './map-domain-error';

type RequestWithUser = { user?: JwtPayload };

function toPaymentDto(p: Payment): PaymentDto {
  return {
    id: p.id,
    bookingId: p.bookingId,
    provider: p.provider,
    amount: p.amount,
    status: p.status,
    transactionId: p.transactionId,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(@Inject(IPaymentsService) private readonly paymentsService: IPaymentsService) {}

  // ── POST /payments ────────────────────────────────────────────────────────
  // Auth optional: guests who have a booking can also pay for it.

  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ operationId: 'createPayment', summary: 'Initiate payment for a booking' })
  @ApiResponse({ status: 201, type: CreatePaymentResponseDto })
  async create(
    @Body() body: CreatePaymentBodyDto,
    @Request() req: RequestWithUser,
  ): Promise<CreatePaymentResponseDto> {
    try {
      const actor = { userId: req.user?.sub ?? null, role: req.user?.role };
      const { payment, paymentUrl } = await this.paymentsService.createForBooking(
        body.bookingId,
        body.provider,
        body.returnUrl,
        actor,
      );
      return { ...toPaymentDto(payment), paymentUrl };
    } catch (err) {
      throw mapPaymentsDomainError(err);
    }
  }

  // ── POST /payments/webhooks/momo (public, no auth) ────────────────────────

  @Post('webhooks/momo')
  @HttpCode(200)
  @ApiOperation({ operationId: 'momoWebhook', summary: 'Momo payment webhook (public)' })
  @ApiResponse({ status: 200 })
  async momoWebhook(@Req() req: ExpressRequest): Promise<void> {
    try {
      const headers = req.headers as Record<string, string>;
      // Body already parsed as JSON by Express default parser; re-stringify for provider
      const rawBody = JSON.stringify(req.body);
      await this.paymentsService.handleWebhook('momo', headers, rawBody);
    } catch (err) {
      throw mapPaymentsDomainError(err);
    }
  }

  // ── POST /payments/webhooks/stripe (public, no auth) ─────────────────────
  // Stripe requires the raw (unparsed) body for signature verification.
  // main.ts registers express.raw() middleware scoped to this path.

  @Post('webhooks/stripe')
  @HttpCode(200)
  @ApiOperation({ operationId: 'stripeWebhook', summary: 'Stripe payment webhook (public)' })
  @ApiResponse({ status: 200 })
  async stripeWebhook(@Req() req: RawBodyRequest<ExpressRequest>): Promise<void> {
    try {
      const headers = req.headers as Record<string, string>;
      // express.raw() puts the Buffer in req.body; RawBodyRequest stores it in req.rawBody.
      // Support both patterns so unit tests and production both work.
      const rawBody: Buffer | string =
        req.rawBody ??
        (Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body ?? '')));
      await this.paymentsService.handleWebhook('stripe', headers, rawBody);
    } catch (err) {
      throw mapPaymentsDomainError(err);
    }
  }

  // ── POST /payments/:id/confirm (admin only) ───────────────────────────────

  @Post(':id/confirm')
  @HttpCode(200)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(['admin'])
  @ApiOperation({
    operationId: 'manualConfirmPayment',
    summary: 'Admin: force-confirm a payment (bypass webhook)',
  })
  @ApiResponse({ status: 200 })
  async manualConfirm(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: PaymentManualConfirmBodyDto,
    @Request() req: RequestWithUser,
  ): Promise<void> {
    try {
      const actor = { userId: req.user!.sub, role: req.user!.role };
      await this.paymentsService.manualConfirm(id, body.transactionId, actor);
    } catch (err) {
      throw mapPaymentsDomainError(err);
    }
  }

  // ── GET /payments/:id ─────────────────────────────────────────────────────

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(['customer', 'admin'])
  @ApiOperation({ operationId: 'getPayment', summary: 'Get payment status' })
  @ApiResponse({ status: 200, type: PaymentDto })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: RequestWithUser,
  ): Promise<PaymentDto> {
    try {
      const actor = { userId: req.user!.sub, role: req.user!.role };
      const payment = await this.paymentsService.findById(id, actor);
      return toPaymentDto(payment);
    } catch (err) {
      throw mapPaymentsDomainError(err);
    }
  }
}
