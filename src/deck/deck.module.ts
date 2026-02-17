import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Book } from 'src/book/entity/book.entity';
import { Card } from 'src/card/entity/card.entity';
import { DeckConnection } from 'src/deck-connection/entity/deck-connection.entity';
import { DeckNode } from 'src/deck-node/entity/deck-node.entity';
import { User } from 'src/user/entity/user.entity';
import { DeckController } from './deck.controller';
import { DeckService } from './deck.service';
import { Deck } from './entity/deck.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Deck,
      DeckNode,
      DeckConnection,
      User,
      Book,
      Card,
    ]),
  ],
  providers: [DeckService],
  controllers: [DeckController],
})
export class DeckModule {}
