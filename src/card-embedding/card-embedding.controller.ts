import { Body, Controller, Post, Req } from '@nestjs/common';
import { SearchCardEmbeddingDto } from './dto/search-card-embedding.dto';
import { CardEmbeddingService } from './card-embedding.service';

@Controller('card-embeddings')
export class CardEmbeddingController {
  constructor(private readonly cardEmbeddingService: CardEmbeddingService) {}

  @Post('search')
  search(@Req() req: any, @Body() dto: SearchCardEmbeddingDto) {
    const userId = req.user.sub;

    return this.cardEmbeddingService.searchRelevantCards(
      userId,
      dto.message,
      dto.limit ?? 5,
    );
  }
}
