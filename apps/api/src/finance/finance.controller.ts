import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { FinanceService } from './finance.service';
import { TransferService } from './transfer.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AddMatchRewardDto } from './dto/add-match-reward.dto';
import { InitiateTransferDto } from './dto/initiate-transfer.dto';
import { CreateContractDto } from './dto/create-contract.dto';
import { PrismaService } from '../prisma/prisma.service';

@Controller('finance')
@UseGuards(JwtAuthGuard)
export class FinanceController {
  constructor(
    private readonly financeService: FinanceService,
    private readonly transferService: TransferService,
    private readonly prisma: PrismaService,
  ) {}

  @Get(':teamId')
  getTeamFinances(@Param('teamId', ParseUUIDPipe) teamId: string) {
    return this.financeService.getTeamFinances(teamId);
  }

  @Post('match-reward')
  addMatchReward(@Body() dto: AddMatchRewardDto) {
    return this.financeService.addMatchReward(dto.team_id, dto.result);
  }

  @Post('transfer')
  initiateTransfer(@Body() dto: InitiateTransferDto) {
    return this.transferService.initiateTransfer(
      dto.buying_team_id,
      dto.player_id,
    );
  }

  @Post('contracts')
  createContract(@Body() dto: CreateContractDto) {
    return this.prisma.contract.create({
      data: {
        team_id: dto.team_id,
        user_id: dto.user_id,
        salary: dto.salary,
        release_clause: dto.release_clause,
        expires_at: new Date(dto.expires_at),
      },
    });
  }
}
