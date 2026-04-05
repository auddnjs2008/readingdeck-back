import { Injectable } from '@nestjs/common';
import { CardEmbeddingService } from 'src/card-embedding/card-embedding.service';
import { ChatDto } from './dto/chat.dto';
import { createReadingChatGraph } from './graphs/reading-chat.graph';
import { AiChatUsageService } from './ai-chat-usage.service';

@Injectable()
export class AiService {
  constructor(
    private readonly cardEmbeddingService: CardEmbeddingService,
    private readonly aiChatUsageService: AiChatUsageService,
  ) {}

  async chat(userId: number, dto: ChatDto) {
    await this.aiChatUsageService.assertWithinDailyLimit(userId);

    const graph = createReadingChatGraph(this.cardEmbeddingService);

    const result = await graph.invoke({
      userId,
      message: dto.message,
      limit: dto.limit ?? 5,
      retrievedCards: [],
      answer: '',
      sourceCardIds: [],
    });

    const sources = result.retrievedCards.filter((card: { cardId: number }) =>
      result.sourceCardIds.includes(card.cardId),
    );

    return {
      answer: result.answer,
      sources,
    };
  }
}
