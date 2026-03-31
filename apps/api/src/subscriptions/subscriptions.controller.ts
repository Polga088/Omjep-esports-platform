import {
  Controller,
  Get,
  Post,
  Param,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { SubscriptionPlanCode } from '@omjep/database';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SubscriptionsService } from './subscriptions.service';

type AuthedRequest = { user: { id: string } };

function parsePlanCode(raw: string): SubscriptionPlanCode {
  const u = raw.trim().toUpperCase();
  if (u === 'PLAYER' || u === 'PRESIDENT') {
    return u as SubscriptionPlanCode;
  }
  throw new BadRequestException(
    'Code de plan invalide. Utilisez PLAYER ou PRESIDENT.',
  );
}

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('plans')
  listPlans() {
    return this.subscriptionsService.listPlans();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  mySubscriptions(@Req() req: AuthedRequest) {
    return this.subscriptionsService.getMyActiveSubscriptions(req.user.id);
  }

  @Post('buy/:planCode')
  @UseGuards(JwtAuthGuard)
  buy(@Param('planCode') planCode: string, @Req() req: AuthedRequest) {
    const code = parsePlanCode(planCode);
    return this.subscriptionsService.buyPlan(req.user.id, code);
  }
}
