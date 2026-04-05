import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Card } from 'src/card/entity/card.entity';
import { CardEmbedding } from './entity/card-embedding.entity';
import { CardEmbeddingService } from './card-embedding.service';
import { EmbeddingModule } from 'src/embedding/embedding.module';

@Module({
  imports: [TypeOrmModule.forFeature([Card, CardEmbedding]), EmbeddingModule],
  providers: [CardEmbeddingService],
  exports: [CardEmbeddingService],
})
export class CardEmbeddingModule {}
