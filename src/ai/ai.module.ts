import { Module } from '@nestjs/common';
import { CardEmbeddingModule } from 'src/card-embedding/card-embedding.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  imports: [CardEmbeddingModule],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
