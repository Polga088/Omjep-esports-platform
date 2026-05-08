import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { AdminEmailTemplatesService } from './admin-email-templates.service'
import { UpdateEmailTemplateDto } from './dto/update-email-template.dto'
import { TestEmailTemplateDto } from './dto/test-email-template.dto'

@Controller('admin/email-templates')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminEmailTemplatesController {
  constructor(private readonly templates: AdminEmailTemplatesService) {}

  @Get()
  list() {
    return this.templates.list()
  }

  @Get(':key')
  getByKey(@Param('key') key: string) {
    return this.templates.getByKey(key)
  }

  @Patch(':key')
  update(@Param('key') key: string, @Body() dto: UpdateEmailTemplateDto) {
    return this.templates.updateByKey(key, dto)
  }

  @Post(':key/test')
  testSend(@Param('key') key: string, @Body() dto: TestEmailTemplateDto) {
    return this.templates.sendTest(key, dto.to, dto.variables ?? {}, dto.subjectPrefix)
  }
}

