import { Injectable, NotFoundException } from '@nestjs/common';
import { CardEmbeddingService } from 'src/card-embedding/card-embedding.service';
import { ChatDto } from './dto/chat.dto';
import { createReadingChatGraph } from './graphs/reading-chat.graph';
import { AiChatUsageService } from './ai-chat-usage.service';
import { InjectRepository } from '@nestjs/typeorm';
import { AiChatThread } from './entity/ai-chat-thread.entity';
import { Repository } from 'typeorm';
import {
  AiChatMessage,
  AiChatMessageRole,
} from './entity/ai-chat-message.entity';

@Injectable()
export class AiService {
  constructor(
    private readonly cardEmbeddingService: CardEmbeddingService,
    private readonly aiChatUsageService: AiChatUsageService,
    @InjectRepository(AiChatThread)
    private readonly aiChatThreadRepository: Repository<AiChatThread>,
    @InjectRepository(AiChatMessage)
    private readonly aiChatMessageRepository: Repository<AiChatMessage>,
  ) {}

  async chat(userId: number, dto: ChatDto) {
    await this.aiChatUsageService.assertWithinDailyLimit(userId);

    const thread = await this.getOrCreateThread(userId, dto.threadId);
    await this.saveMessage(thread.id, AiChatMessageRole.USER, dto.message);

    const history = await this.getRecentHistory(thread.id);

    const graph = createReadingChatGraph(this.cardEmbeddingService);

    const result = await graph.invoke({
      userId,
      message: dto.message,
      limit: dto.limit ?? 5,
      rewrittenQuery: '',
      history,
      retrievedCards: [],
      answer: '',
      sourceCardIds: [],
    });

    await this.saveMessage(
      thread.id,
      AiChatMessageRole.ASSISTANT,
      result.answer,
    );

    const sources = result.retrievedCards.filter((card: { cardId: number }) =>
      result.sourceCardIds.includes(card.cardId),
    );

    return {
      threadId: thread.id,
      answer: result.answer,
      sources,
    };
  }

  private async getOrCreateThread(userId: number, threadId?: string) {
    if (!threadId) {
      const createdThread = this.aiChatThreadRepository.create({
        userId,
      });
      return this.aiChatThreadRepository.save(createdThread);
    }
    const thread = await this.aiChatThreadRepository.findOne({
      where: { id: threadId, userId },
    });

    if (!thread) {
      throw new NotFoundException('해당 AI 대화 세션을 찾을 수 없습니다.');
    }

    return thread;
  }

  private async saveMessage(
    threadId: string,
    role: AiChatMessageRole,
    content: string,
  ) {
    const message = this.aiChatMessageRepository.create({
      threadId,
      role,
      content,
    });
    return this.aiChatMessageRepository.save(message);
  }

  private async getRecentHistory(threadId: string, limit = 6) {
    const messages = await this.aiChatMessageRepository.find({
      where: { threadId },
      order: { id: 'DESC' },
      take: limit,
    });

    return messages.reverse().map((message) => ({
      role: message.role,
      content: message.content,
    }));
  }
}
