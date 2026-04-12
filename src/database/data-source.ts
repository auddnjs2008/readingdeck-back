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
import { CardEmbedding } from 'src/card-embedding/entity/card-embedding.entity';
import { AiChatUsage } from 'src/ai/entity/ai-chat-usage.entity';
import { AiChatThread } from 'src/ai/entity/ai-chat-thread.entity';
import { AiChatMessage } from 'src/ai/entity/ai-chat-message.entity';
import { AiHelpDocument } from 'src/ai/entity/ai-help-document.entity';

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
    CardEmbedding,
    AiChatUsage,
    AiChatThread,
    AiChatMessage,
    AiHelpDocument,
  ],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
});
