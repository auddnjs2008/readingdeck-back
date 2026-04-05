import { CardEmbeddingService } from 'src/card-embedding/card-embedding.service';
import { ChatDto } from './dto/chat.dto';
import { createReadingChatGraph } from './graphs/reading-chat.graph';

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

    return {
      answer: result.answer,
      sourceCardIds: result.sourceCardIds,
      retrievedCards: result.retrievedCards,
    };
  }
}
