import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@api/prisma/prisma.service';
import type { Prisma } from '@omjep/database';
import type { NewsEventType } from '@omjep/shared';

export interface CreateNewsEventInput {
  type: NewsEventType;
  title: string;
  description: string;
  metadata?: Record<string, unknown>;
}

export type NewsCategory = 'MERCATO' | 'TOURNAMENT' | 'UPDATE';

interface NewsFeedFilters {
  page: number;
  limit: number;
  category?: NewsCategory;
}

interface CreateNewsArticleInput {
  category: NewsCategory;
  title: string;
  excerpt: string;
  readTime: string;
  image?: string;
  quote?: string;
  body?: string[];
}

const DEFAULT_CATEGORY_IMAGES: Record<NewsCategory, string> = {
  MERCATO: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1400&q=80',
  TOURNAMENT: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1400&q=80',
  UPDATE: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&w=1400&q=80',
};

@Injectable()
export class NewsService {
  constructor(private readonly prisma: PrismaService) {}

  private mapCategoryToTypes(category: NewsCategory): NewsEventType[] {
    if (category === 'MERCATO') {
      return ['TRANSFER', 'CONTRACT_RENEWAL'];
    }
    if (category === 'TOURNAMENT') {
      return ['TOURNAMENT_WIN', 'SEASON_START'];
    }
    return ['RECORD_BROKEN', 'OTHER'];
  }

  private mapTypeToCategory(type: NewsEventType): NewsCategory {
    if (type === 'TRANSFER' || type === 'CONTRACT_RENEWAL') {
      return 'MERCATO';
    }
    if (type === 'TOURNAMENT_WIN' || type === 'SEASON_START') {
      return 'TOURNAMENT';
    }
    return 'UPDATE';
  }

  private mapCategoryToType(category: NewsCategory): NewsEventType {
    if (category === 'MERCATO') {
      return 'TRANSFER';
    }
    if (category === 'TOURNAMENT') {
      return 'TOURNAMENT_WIN';
    }
    return 'OTHER';
  }

  private readMetadata(metadata: Prisma.JsonValue | null): Record<string, unknown> {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return {};
    }
    return metadata as Record<string, unknown>;
  }

  private getFallbackImage(category: NewsCategory): string {
    return DEFAULT_CATEGORY_IMAGES[category];
  }

  private slugifyTitle(title: string): string {
    return title
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }

  private getCategoryFromMetadata(metadataCategory: unknown, eventType: NewsEventType): NewsCategory {
    if (
      metadataCategory === 'MERCATO' ||
      metadataCategory === 'TOURNAMENT' ||
      metadataCategory === 'UPDATE'
    ) {
      return metadataCategory;
    }
    return this.mapTypeToCategory(eventType);
  }

  private getBodyFromMetadata(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value.filter((paragraph): paragraph is string => typeof paragraph === 'string');
  }

  private getViewsFromMetadata(value: unknown): number {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      return 0;
    }
    return Math.floor(value);
  }

  private getSlugFromMetadata(metadata: Record<string, unknown>, title: string): string {
    const metadataSlug = metadata.slug;
    if (typeof metadataSlug === 'string' && metadataSlug.trim().length > 0) {
      return metadataSlug;
    }
    return this.slugifyTitle(title);
  }

  private mapEventToArticle(event: {
    id: string;
    type: NewsEventType;
    title: string;
    description: string;
    metadata: Prisma.JsonValue | null;
    created_at: Date;
  }) {
    const metadata = this.readMetadata(event.metadata);
    const category = this.getCategoryFromMetadata(metadata.category, event.type);
    const fallbackImage = this.getFallbackImage(category);
    const body = this.getBodyFromMetadata(metadata.body);
    const views = this.getViewsFromMetadata(metadata.views);
    const slug = this.getSlugFromMetadata(metadata, event.title);

    return {
      id: event.id,
      slug,
      category,
      title: event.title,
      excerpt: event.description,
      readTime: typeof metadata.readTime === 'string' ? metadata.readTime : '5 min',
      image: typeof metadata.image === 'string' && metadata.image.trim().length > 0 ? metadata.image : fallbackImage,
      quote: typeof metadata.quote === 'string' ? metadata.quote : null,
      body,
      views,
      createdAt: event.created_at,
    };
  }

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

  async createArticle(input: CreateNewsArticleInput) {
    const type = this.mapCategoryToType(input.category);
    const safeBody = Array.isArray(input.body)
      ? input.body.filter((paragraph) => typeof paragraph === 'string' && paragraph.trim().length > 0)
      : [];
    const safeImage = input.image?.trim() || this.getFallbackImage(input.category);
    const slug = this.slugifyTitle(input.title);

    return this.createEvent({
      type,
      title: input.title,
      description: input.excerpt,
      metadata: {
        slug,
        category: input.category,
        readTime: input.readTime,
        image: safeImage,
        quote: input.quote ?? null,
        body: safeBody,
        views: 0,
      },
    });
  }

  async getNewsFeed(filters: NewsFeedFilters) {
    const page = Math.max(1, filters.page);
    const limit = Math.max(1, Math.min(24, filters.limit));
    const types = filters.category ? this.mapCategoryToTypes(filters.category) : undefined;
    const where: Prisma.NewsEventWhereInput =
      types && types.length > 0
        ? { type: { in: types } }
        : {};

    const [total, events] = await Promise.all([
      this.prisma.newsEvent.count({ where }),
      this.prisma.newsEvent.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const items = events.map((event) => this.mapEventToArticle(event));

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async getArticleBySlugOrId(slugOrId: string) {
    let event = this.isUuid(slugOrId)
      ? await this.prisma.newsEvent.findUnique({ where: { id: slugOrId } })
      : null;

    if (!event) {
      const recentEvents = await this.prisma.newsEvent.findMany({
        orderBy: { created_at: 'desc' },
        take: 250,
      });

      event = recentEvents.find((item) => {
        const metadata = this.readMetadata(item.metadata);
        const candidateSlug = this.getSlugFromMetadata(metadata, item.title);
        return candidateSlug === slugOrId;
      }) ?? null;
    }

    if (!event) {
      throw new NotFoundException('Article introuvable');
    }

    const metadata = this.readMetadata(event.metadata);
    const currentViews = this.getViewsFromMetadata(metadata.views);
    const nextViews = currentViews + 1;

    const updatedEvent = await this.prisma.newsEvent.update({
      where: { id: event.id },
      data: {
        metadata: {
          ...metadata,
          views: nextViews,
        } as Prisma.InputJsonValue,
      },
    });

    return this.mapEventToArticle(updatedEvent);
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
