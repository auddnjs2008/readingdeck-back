import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiChatUsage } from './entity/ai-chat-usage.entity';

const DAILY_AI_CHAT_LIMIT = 10;

@Injectable()
export class AiChatUsageService {
  constructor(
    @InjectRepository(AiChatUsage)
    private readonly aiChatUsageRepository: Repository<AiChatUsage>,
  ) {}

  async assertWithinDailyLimit(userId: number) {
    const today = new Date().toISOString().slice(0, 10);

    let usage = await this.aiChatUsageRepository.findOne({
      where: { userId, date: today },
    });

    if (!usage) {
      usage = this.aiChatUsageRepository.create({
        userId,
        date: today,
        count: 1,
      });
      await this.aiChatUsageRepository.save(usage);
      return;
    }

    if (usage.count >= DAILY_AI_CHAT_LIMIT) {
      throw new HttpException(
        '오늘 AI 대화 사용 한도에 도달했어요. 내일 다시 시도해 주세요.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    usage.count += 1;
    await this.aiChatUsageRepository.save(usage);
  }
}
