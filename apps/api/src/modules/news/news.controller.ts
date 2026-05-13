import { Body, Controller, DefaultValuePipe, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { NewsService } from './news.service';
import { NewsEventType } from '@omjep/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetNewsQueryDto } from './dto/get-news-query.dto';
import { CreateNewsArticleDto } from './dto/create-news-article.dto';

@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get()
  getNews(@Query() query: GetNewsQueryDto) {
    return this.newsService.getNewsFeed({
      page: query.page ?? 1,
      limit: query.limit ?? 9,
      category: query.category,
    });
  }

  @Get('events')
  getRecentNews(
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('cursor') cursor?: string,
    @Query('type') type?: NewsEventType,
  ) {
    const types = type ? [type] : undefined;
    return this.newsService.getRecentEvents({ limit, cursor, types });
  }

  @Get('transfers')
  getTransferNews(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.newsService.getTransferNews(limit);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  createArticle(@Body() body: CreateNewsArticleDto) {
    return this.newsService.createArticle({
      category: body.category,
      type: body.type,
      title: body.title,
      excerpt: body.excerpt,
      readTime: body.readTime,
      image: body.image,
      quote: body.quote,
      body: body.body,
      coverTemplate: body.coverTemplate,
      coverData: body.coverData,
      published: body.published,
    });
  }

  @Get(':slugOrId')
  getArticle(@Param('slugOrId') slugOrId: string) {
    return this.newsService.getArticleBySlugOrId(slugOrId);
  }
}
