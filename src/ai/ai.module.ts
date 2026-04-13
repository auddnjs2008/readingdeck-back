import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CardEmbeddingModule } from 'src/card-embedding/card-embedding.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiChatUsage } from './entity/ai-chat-usage.entity';
import { AiChatUsageService } from './ai-chat-usage.service';
import { AiChatThread } from './entity/ai-chat-thread.entity';
import { AiChatMessage } from './entity/ai-chat-message.entity';
import { AiHelpDocument } from './entity/ai-help-document.entity';
import { EmbeddingModule } from 'src/embedding/embedding.module';
import { AiHelpDocumentSyncService } from './ai-help-document-sync.service';

@Module({
  imports: [
    CardEmbeddingModule,
    EmbeddingModule,
    TypeOrmModule.forFeature([
      AiChatUsage,
      AiChatThread,
      AiChatMessage,
      AiHelpDocument,
    ]),
  ],
  controllers: [AiController],
  providers: [
    AiService,
    AiChatUsageService,
    AiHelpDocumentSyncService,
    AiHelpDocumentSyncService,
  ],
  exports: [AiHelpDocumentSyncService],
})
export class AiModule {}
