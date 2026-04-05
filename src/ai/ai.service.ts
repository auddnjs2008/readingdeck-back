import { Injectable } from '@nestjs/common';
import { CardEmbeddingService } from 'src/card-embedding/card-embedding.service';
import { ChatDto } from './dto/chat.dto';
import { createReadingChatGraph } from './graphs/reading-chat.graph';

@Injectable()
export class AiService {
  constructor(private readonly cardEmbeddingService: CardEmbeddingService) {}

  async chat(userId: number, dto: ChatDto) {
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
