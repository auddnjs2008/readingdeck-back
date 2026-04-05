import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CardEmbeddingModule } from 'src/card-embedding/card-embedding.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiChatUsage } from './entity/ai-chat-usage.entity';
import { AiChatUsageService } from './ai-chat-usage.service';

@Module({
  imports: [CardEmbeddingModule, TypeOrmModule.forFeature([AiChatUsage])],
  controllers: [AiController],
  providers: [AiService, AiChatUsageService],
})
export class AiModule {}
