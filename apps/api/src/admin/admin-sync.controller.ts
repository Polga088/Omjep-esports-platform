import {
  Controller,
  Post,
  Param,
  ParseUUIDPipe,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ProClubsService } from '../sync/proclubs.service';

@Controller('admin/sync')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminSyncController {
  constructor(private readonly proClubsService: ProClubsService) {}

  @Post(':matchId')
  async syncMatch(@Param('matchId', ParseUUIDPipe) matchId: string) {
    try {
      const result = await this.proClubsService.syncMatch(matchId);

      if (!result.synced) {
        return {
          message: `Synchronisation impossible : ${result.reason}`,
          synced: false,
        };
      }

      return {
        message: 'Match synchronisé avec succès via ProClubs.',
        synced: true,
        match: result.match,
      };
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
  }
}
