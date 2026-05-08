import { Injectable } from '@nestjs/common'
import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'

type EmailSendArgs = {
  to: string
  subject: string
  html: string
  text?: string | null
}

function readEnvInt(name: string, fallback: number): number {
  const raw = process.env[name]
  if (!raw) return fallback
  const n = Number(raw)
  return Number.isFinite(n) ? n : fallback
}

function readEnvBool(name: string, fallback: boolean): boolean {
  const raw = process.env[name]
  if (raw == null) return fallback
  const norm = String(raw).trim().toLowerCase()
  if (['1', 'true', 'yes', 'y'].includes(norm)) return true
  if (['0', 'false', 'no', 'n'].includes(norm)) return false
  return fallback
}

@Injectable()
export class EmailService {
  private readonly transporter: Transporter
  private readonly from: string

  constructor() {
    const host = (process.env.SMTP_HOST ?? '127.0.0.1').trim()
    const port = readEnvInt('SMTP_PORT', 25)
    const secure = readEnvBool('SMTP_SECURE', false)
    this.from = (process.env.SMTP_FROM ?? 'OMJEP <noreply@omjep.ma>').trim()

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
    })
  }

  async send({ to, subject, html, text }: EmailSendArgs) {
    return this.transporter.sendMail({
      from: this.from,
      to,
      subject,
      html,
      text: text ?? undefined,
    })
  }
}

