import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Card } from 'src/card/entity/card.entity';
import { CommunityController } from './community.controller';
import { CommunityService } from './community.service';
import { CommunityPost } from './entity/community-post.entity';
import { DeckConnection } from 'src/deck-connection/entity/deck-connection.entity';
import { DeckNode } from 'src/deck-node/entity/deck-node.entity';
import { Deck } from 'src/deck/entity/deck.entity';
import { User } from 'src/user/entity/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CommunityPost,
      Deck,
      DeckNode,
      DeckConnection,
      Card,
      User,
    ]),
  ],
  providers: [CommunityService],
  controllers: [CommunityController],
})
export class CommunityModule {}
