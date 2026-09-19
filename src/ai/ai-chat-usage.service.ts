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

  async getUsage(userId: number) {
    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const usage = await this.aiChatUsageRepository.findOne({
      where: { userId, date },
    });
    const resetsAt = new Date(date);
    resetsAt.setUTCDate(resetsAt.getUTCDate() + 1);
    return {
      limit: DAILY_AI_CHAT_LIMIT,
      remaining: Math.max(0, DAILY_AI_CHAT_LIMIT - (usage?.count ?? 0)),
      resetsAt: resetsAt.toISOString(),
    };
  }

  async reserve(userId: number): Promise<string> {
    const date = new Date().toISOString().slice(0, 10);
    // The unique user/day index serializes competing requests, including first use.
    const rows: { count: number }[] = await this.aiChatUsageRepository.query(
      `INSERT INTO "ai_chat_usage" ("userId", "date", "count", "version")
       VALUES ($1, $2, 1, 1)
       ON CONFLICT ("userId", "date") DO UPDATE
       SET "count" = "ai_chat_usage"."count" + 1,
           "updatedAt" = now(), "version" = "ai_chat_usage"."version" + 1
       WHERE "ai_chat_usage"."count" < $3
       RETURNING "count"`,
      [userId, date, DAILY_AI_CHAT_LIMIT],
    );
    if (rows.length === 0) {
      throw new HttpException(
        '오늘 AI 대화 10회를 모두 사용했어요. 한국 시간 오전 9시에 다시 이용할 수 있어요.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return date;
  }

  async refund(userId: number, date: string): Promise<void> {
    await this.aiChatUsageRepository.query(
      `UPDATE "ai_chat_usage"
       SET "count" = GREATEST("count" - 1, 0), "updatedAt" = now(), "version" = "version" + 1
       WHERE "userId" = $1 AND "date" = $2`,
      [userId, date],
    );
  }
}
