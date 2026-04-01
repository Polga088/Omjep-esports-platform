import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminStoreService } from './admin-store.service';
import { AdminStoreItemCreateDto } from './dto/admin-store-item-create.dto';
import { AdminStoreItemPatchDto } from './dto/admin-store-item-patch.dto';
import { AdminStorePlanPatchDto } from './dto/admin-store-plan-patch.dto';

@Controller('admin/store')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminStoreController {
  constructor(private readonly adminStoreService: AdminStoreService) {}

  @Get('stats')
  stats() {
    return this.adminStoreService.getStats();
  }

  @Post('items')
  createItem(@Body() dto: AdminStoreItemCreateDto) {
    return this.adminStoreService.createItem(dto);
  }

  @Patch('items/:id')
  updateItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminStoreItemPatchDto,
  ) {
    return this.adminStoreService.updateItem(id, dto);
  }

  @Patch('plans/:code')
  updatePlan(
    @Param('code') code: string,
    @Body() dto: AdminStorePlanPatchDto,
  ) {
    return this.adminStoreService.updatePlan(code, dto);
  }
}
