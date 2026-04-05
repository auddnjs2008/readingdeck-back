import { Module } from '@nestjs/common';
import { CardService } from './card.service';
import { CardController } from './card.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Card } from './entity/card.entity';
import { User } from 'src/user/entity/user.entity';
import { Book } from 'src/book/entity/book.entity';
import { CardEmbeddingModule } from 'src/card-embedding/card-embedding.module';

@Module({
  imports: [TypeOrmModule.forFeature([Card, User, Book]), CardEmbeddingModule],
  providers: [CardService],
  controllers: [CardController],
  exports: [CardService],
})
export class CardModule {}
