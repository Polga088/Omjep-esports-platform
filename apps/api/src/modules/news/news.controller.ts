import { Controller, Get, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { NewsService } from './news.service';
import { NewsEventType } from '@omjep/shared';

@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get()
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
}
