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
  type AssignStaffBodyDto,
  type CreateOperatorBodyDto,
  OperatorDto,
  PublicStaffUserDto,
  type SetOperatorStatusBodyDto,
  type UpdateOperatorBodyDto,
} from './dto/operators.dto';
import { mapOperatorsDomainError } from './map-domain-error';

import { Roles } from '@/modules/auth/infrastructure/decorators/roles.decorator';
import { JwtAuthGuard } from '@/modules/auth/infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/infrastructure/guards/roles.guard';
import type { Operator } from '@/modules/operators/domain/entities/operator.entity';
import { IOperatorsService } from '@/modules/operators/domain/interfaces/operators.service';

function toOperatorDto(op: Operator): OperatorDto {
  return op;
}

@ApiTags('operators')
@Controller('operators')
export class OperatorsController {
  constructor(@Inject(IOperatorsService) private readonly operators: IOperatorsService) {}

  // ---- Public read --------------------------------------------------------

  @Get()
  @ApiOperation({
    operationId: 'listOperators',
    summary: 'List active operators (public)',
  })
  @ApiResponse({ status: 200, type: [OperatorDto] })
  async listActive(): Promise<OperatorDto[]> {
    const ops = await this.operators.listActive();
    return ops.map(toOperatorDto);
  }

  // ---- Admin --------------------------------------------------------------

  @Get('all')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(['admin'])
  @ApiOperation({ operationId: 'listAllOperators', summary: 'List every operator (admin only)' })
  @ApiResponse({ status: 200, type: [OperatorDto] })
  async listAll(): Promise<OperatorDto[]> {
    const ops = await this.operators.list();
    return ops.map(toOperatorDto);
  }

  @Get(':id')
  @ApiOperation({ operationId: 'getOperator', summary: 'Get a single operator by id' })
  @ApiResponse({ status: 200, type: OperatorDto })
  async getOne(@Param('id', ParseIntPipe) id: number): Promise<OperatorDto> {
    try {
      return toOperatorDto(await this.operators.getById(id));
    } catch (err) {
      throw mapOperatorsDomainError(err);
    }
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(['admin'])
  @ApiOperation({ operationId: 'createOperator', summary: 'Create a new operator (admin only)' })
  @ApiResponse({ status: 201, type: OperatorDto })
  async create(@Body() body: CreateOperatorBodyDto): Promise<OperatorDto> {
    try {
      return toOperatorDto(await this.operators.create(body));
    } catch (err) {
      throw mapOperatorsDomainError(err);
    }
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(['admin'])
  @ApiOperation({ operationId: 'updateOperator', summary: 'Update operator metadata (admin only)' })
  @ApiResponse({ status: 200, type: OperatorDto })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateOperatorBodyDto,
  ): Promise<OperatorDto> {
    try {
      return toOperatorDto(await this.operators.update(id, body));
    } catch (err) {
      throw mapOperatorsDomainError(err);
    }
  }

  @Patch(':id/status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(['admin'])
  @ApiOperation({
    operationId: 'setOperatorStatus',
    summary: 'Activate / suspend an operator (admin only)',
  })
  @ApiResponse({ status: 200, type: OperatorDto })
  async setStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: SetOperatorStatusBodyDto,
  ): Promise<OperatorDto> {
    try {
      return toOperatorDto(await this.operators.setStatus(id, body.status));
    } catch (err) {
      throw mapOperatorsDomainError(err);
    }
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(['admin'])
  @ApiOperation({ operationId: 'deleteOperator', summary: 'Delete operator (admin only)' })
  @ApiResponse({ status: 204 })
  async delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    try {
      await this.operators.delete(id);
    } catch (err) {
      throw mapOperatorsDomainError(err);
    }
  }

  @Post(':id/staff')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(['admin'])
  @ApiOperation({
    operationId: 'assignOperatorStaff',
    summary: 'Assign a user (role operator|driver) to an operator',
  })
  @ApiResponse({ status: 200, type: PublicStaffUserDto })
  async assignStaff(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: AssignStaffBodyDto,
  ): Promise<PublicStaffUserDto> {
    try {
      const user = await this.operators.assignStaff(id, body);
      return {
        ...user,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      };
    } catch (err) {
      throw mapOperatorsDomainError(err);
    }
  }
}
