import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { TicketReplyDto } from './dto/ticket-reply.dto';
import { AdminPatchTicketDto } from './dto/admin-patch-ticket.dto';

type AuthedReq = Request & { user: { id: string; role: string } };

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Req() req: AuthedReq, @Body() dto: CreateTicketDto) {
    return this.ticketsService.create(req.user.id, dto);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  findMine(@Req() req: AuthedReq) {
    return this.ticketsService.findMine(req.user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  findAllAdmin() {
    return this.ticketsService.findAllAdmin();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Req() req: AuthedReq, @Param('id', ParseUUIDPipe) id: string) {
    const isAdmin = req.user.role === 'ADMIN';
    return this.ticketsService.findOne(id, req.user.id, isAdmin);
  }

  @Post(':id/replies')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  addReply(
    @Req() req: AuthedReq,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TicketReplyDto,
  ) {
    return this.ticketsService.addStaffReply(id, req.user.id, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  adminPatch(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AdminPatchTicketDto) {
    return this.ticketsService.adminPatch(id, dto);
  }
}
