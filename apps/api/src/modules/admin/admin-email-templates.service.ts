import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '@api/prisma/prisma.service'
import { EmailService } from '../email/email.service'
import { UpdateEmailTemplateDto } from './dto/update-email-template.dto'

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function getVariable(variables: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.').filter(Boolean)
  let current: unknown = variables
  for (const p of parts) {
    if (!current || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[p]
  }
  return current
}

function renderPlaceholders(
  template: string,
  variables: Record<string, unknown>,
  mode: 'html' | 'text',
): string {
  const re = /{{\s*([a-zA-Z0-9_.-]+)\s*}}/g
  return template.replace(re, (_m, rawKey) => {
    const key = String(rawKey ?? '').trim()
    const val = getVariable(variables, key)
    if (val == null) return ''
    const str = typeof val === 'string' ? val : JSON.stringify(val)
    if (mode === 'html') return escapeHtml(str)
    return str
  })
}

@Injectable()
export class AdminEmailTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  list() {
    return this.prisma.emailTemplate.findMany({
      orderBy: { key: 'asc' },
    })
  }

  async getByKey(key: string) {
    const t = await this.prisma.emailTemplate.findUnique({ where: { key } })
    if (!t) throw new NotFoundException('Template introuvable.')
    return t
  }

  async updateByKey(key: string, dto: UpdateEmailTemplateDto) {
    const existing = await this.prisma.emailTemplate.findUnique({ where: { key } })
    if (!existing) throw new NotFoundException('Template introuvable.')

    return this.prisma.emailTemplate.update({
      where: { key },
      data: {
        name: dto.name ?? undefined,
        subject: dto.subject ?? undefined,
        preheader: dto.preheader === undefined ? undefined : dto.preheader,
        htmlContent: dto.htmlContent ?? undefined,
        textContent: dto.textContent === undefined ? undefined : dto.textContent,
        enabled: dto.enabled ?? undefined,
      },
    })
  }

  async renderForPreview(key: string, variables: Record<string, unknown>) {
    const t = await this.getByKey(key)
    return {
      key: t.key,
      subject: renderPlaceholders(t.subject, variables, 'text'),
      preheader: t.preheader ? renderPlaceholders(t.preheader, variables, 'text') : null,
      html: renderPlaceholders(t.htmlContent, variables, 'html'),
      text: t.textContent ? renderPlaceholders(t.textContent, variables, 'text') : null,
      enabled: t.enabled,
    }
  }

  async sendTest(key: string, to: string, variables: Record<string, unknown>, subjectPrefix?: string) {
    const rendered = await this.renderForPreview(key, variables)
    if (!rendered.html || rendered.html.trim().length === 0) {
      throw new BadRequestException('Template HTML vide.')
    }

    const prefix = (subjectPrefix ?? '[TEST] ').trim()
    const subject = `${prefix} ${rendered.subject}`.replace(/\s+/g, ' ').trim()

    const result = await this.email.send({
      to,
      subject,
      html: rendered.html,
      text: rendered.text,
    })

    return {
      messageId: result.messageId,
      accepted: result.accepted,
      rejected: result.rejected,
    }
  }
}

