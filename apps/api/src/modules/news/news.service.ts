import { Injectable } from '@nestjs/common';
import { PrismaService } from '@api/prisma/prisma.service';
import type { Prisma } from '@omjep/database';
import type { NewsEventType } from '@omjep/shared';

export interface CreateNewsEventInput {
  type: NewsEventType;
  title: string;
  description: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class NewsService {
  constructor(private readonly prisma: PrismaService) {}

  async createEvent(input: CreateNewsEventInput) {
    return this.prisma.newsEvent.create({
      data: {
        type: input.type,
        title: input.title,
        description: input.description,
        metadata: input.metadata as Prisma.InputJsonValue,
      },
    });
  }

  async getRecentEvents(options?: {
    limit?: number;
    types?: NewsEventType[];
    cursor?: string;
  }) {
    const limit = options?.limit ?? 20;
    const types = options?.types;

    const where = types && types.length > 0 ? { type: { in: types } } : {};

    return this.prisma.newsEvent.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: limit,
      ...(options?.cursor && {
        skip: 1,
        cursor: { id: options.cursor },
      }),
    });
  }

  async getTransferNews(limit = 10) {
    return this.prisma.newsEvent.findMany({
      where: { type: 'TRANSFER' },
      orderBy: { created_at: 'desc' },
      take: limit,
    });
  }

  /**
   * Crée une entrée de transfert dans le fil d'actualité
   */
  async recordTransfer(params: {
    playerId: string;
    playerName: string;
    fromTeamId: string;
    fromTeamName: string;
    toTeamId: string;
    toTeamName: string;
    transferFee: number;
    offeredSalary: number;
    releaseClauseMet?: boolean;
  }) {
    const feeFormatted = params.transferFee.toLocaleString('fr-FR');
    const salaryFormatted = params.offeredSalary.toLocaleString('fr-FR');

    const title = params.releaseClauseMet
      ? `⚡ OFFICIEL : Clause libératoire activée !`
      : `🦅 OFFICIEL : Transfert conclu !`;

    const description = params.releaseClauseMet
      ? `${params.playerName} quitte ${params.fromTeamName} et rejoint ${params.toTeamName} après activation de sa clause libératoire (${feeFormatted} OC).`
      : `${params.playerName} s'engage avec ${params.toTeamName} ! Contrat de ${salaryFormatted} OC/an, frais de transfert : ${feeFormatted} OC.`;

    return this.createEvent({
      type: 'TRANSFER',
      title,
      description,
      metadata: {
        playerId: params.playerId,
        playerName: params.playerName,
        fromTeamId: params.fromTeamId,
        fromTeamName: params.fromTeamName,
        toTeamId: params.toTeamId,
        toTeamName: params.toTeamName,
        transferFee: params.transferFee,
        offeredSalary: params.offeredSalary,
        releaseClauseMet: params.releaseClauseMet ?? false,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
