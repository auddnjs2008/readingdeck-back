import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { User } from 'src/user/entity/user.entity';
import { Book } from 'src/book/entity/book.entity';
import { Card } from 'src/card/entity/card.entity';
import { CommunityComment } from 'src/community/entity/community-comment.entity';
import { CommunityPost } from 'src/community/entity/community-post.entity';
import { Deck } from 'src/deck/entity/deck.entity';
import { DeckNode } from 'src/deck-node/entity/deck-node.entity';
import { DeckConnection } from 'src/deck-connection/entity/deck-connection.entity';
import { Feedback } from 'src/feedback/entity/feedback.entity';

const envFilePath =
  process.env.ENV === 'prod'
    ? 'env/.env.prod'
    : process.env.ENV === 'dev'
      ? 'env/.env.dev'
      : 'env/.env.local';

dotenv.config({ path: envFilePath });

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [
    User,
    Book,
    Card,
    Deck,
    DeckNode,
    DeckConnection,
    CommunityPost,
    CommunityComment,
    Feedback,
  ],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
});
