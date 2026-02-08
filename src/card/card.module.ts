import { Module } from '@nestjs/common';
import { CardService } from './card.service';
import { CardController } from './card.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Card } from './entity/card.entity';
import { User } from 'src/user/entity/user.entity';
import { Book } from 'src/book/entity/book.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Card, User, Book])],
  providers: [CardService],
  controllers: [CardController],
})
export class CardModule {}
