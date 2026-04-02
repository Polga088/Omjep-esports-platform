import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { FinanceService } from './finance.service';
import { TransferService } from './transfer.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AddMatchRewardDto } from './dto/add-match-reward.dto';
import { InitiateTransferDto } from './dto/initiate-transfer.dto';
import { CreateContractDto } from './dto/create-contract.dto';
type AuthedRequest = { user: { id: string; role: string } };

@Controller('finance')
@UseGuards(JwtAuthGuard)
export class FinanceController {
  constructor(
    private readonly financeService: FinanceService,
    private readonly transferService: TransferService,
  ) {}

  @Get(':teamId')
  getTeamFinances(
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Req() req: AuthedRequest,
  ) {
    return this.financeService.getTeamFinances(
      teamId,
      req.user.id,
      req.user.role,
    );
  }

  @Post('match-reward')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  addMatchReward(@Body() dto: AddMatchRewardDto) {
    return this.financeService.addMatchReward(dto.team_id, dto.result);
  }

  @Post('transfer')
  initiateTransfer(
    @Body() dto: InitiateTransferDto,
    @Req() req: AuthedRequest,
  ) {
    return this.transferService.initiateTransfer(
      req.user.id,
      req.user.role,
      dto.buying_team_id,
      dto.player_id,
    );
  }

  @Post('contracts')
  createContract(@Body() dto: CreateContractDto, @Req() req: AuthedRequest) {
    return this.financeService.createContract(
      req.user.id,
      req.user.role,
      dto,
    );
  }
}
