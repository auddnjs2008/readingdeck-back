import { CardType } from 'src/card/entity/card.entity';
import { BaseTable } from 'src/common/entity/base-table.entity';
import { DeckMode, DeckPreview } from 'src/deck/entity/deck.entity';
import { Deck } from 'src/deck/entity/deck.entity';
import { User } from 'src/user/entity/user.entity';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

export type CommunityPostSnapshotNode = {
  id: number;
  type: 'book' | 'card';
  positionX: number;
  positionY: number;
  order: number;
  book: {
    id: number;
    title: string;
    author: string;
    publisher: string;
    backgroundImage: string | null;
  } | null;
  card: {
    id: number;
    type: CardType;
    quote: string | null;
    thought: string;
    backgroundImage: string | null;
    pageStart: number | null;
    pageEnd: number | null;
  } | null;
};

export type CommunityPostSnapshotConnection = {
  id: number;
  fromNodeId: number;
  toNodeId: number;
  type: string | null;
  style: { stroke?: string; strokeWidth?: number } | null;
  animated: boolean;
  markerEnd: { type?: string } | null;
  sourceHandle: string | null;
  targetHandle: string | null;
  label: string | null;
};

export type CommunityPostSnapshot = {
  version: 1;
  deck: {
    id: number;
    name: string;
    description: string | null;
    mode: DeckMode;
  };
  nodes: CommunityPostSnapshotNode[];
  connections: CommunityPostSnapshotConnection[];
};

@Entity()
@Index(['userId', 'createdAt'])
@Index(['deckId'])
@Unique(['deckId'])
export class CommunityPost extends BaseTable {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User, (user) => user.communityPosts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  deckId: number;

  @ManyToOne(() => Deck, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'deckId' })
  deck: Deck;

  @Column({ type: 'text', nullable: true })
  caption: string | null;

  @Column({ length: 255 })
  deckName: string;

  @Column({ type: 'text', nullable: true })
  deckDescription: string | null;

  @Column({ type: 'enum', enum: DeckMode })
  deckMode: DeckMode;

  @Column({ type: 'jsonb' })
  preview: DeckPreview;

  @Column({ type: 'jsonb' })
  snapshot: CommunityPostSnapshot;

  @Column({ type: 'enum', enum: CardType, nullable: true })
  primaryCardType: CardType | null;

  @Column({ type: 'text', nullable: true })
  primaryQuote: string | null;

  @Column({ type: 'text' })
  primaryThought: string;

  @Column({ length: 255, nullable: true })
  bookTitle: string | null;

  @Column({ length: 255, nullable: true })
  bookAuthor: string | null;
}
