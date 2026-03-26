import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Card } from 'src/card/entity/card.entity';
import { CommunityCommentController } from './community-comment.controller';
import { CommunityController } from './community.controller';
import { CommunityService } from './community.service';
import { CommunityComment } from './entity/community-comment.entity';
import { CommunityPost } from './entity/community-post.entity';
import { DeckConnection } from 'src/deck-connection/entity/deck-connection.entity';
import { DeckNode } from 'src/deck-node/entity/deck-node.entity';
import { Deck } from 'src/deck/entity/deck.entity';
import { User } from 'src/user/entity/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CommunityPost,
      CommunityComment,
      Deck,
      DeckNode,
      DeckConnection,
      Card,
      User,
    ]),
  ],
  providers: [CommunityService],
  controllers: [CommunityController, CommunityCommentController],
})
export class CommunityModule {}
