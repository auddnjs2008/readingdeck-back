import { BaseTable } from 'src/common/entity/base-table.entity';
import { DeckConnection } from 'src/deck-connection/entity/deck-connection.entity';
import { DeckNode } from 'src/deck-node/entity/deck-node.entity';
import { User } from 'src/user/entity/user.entity';
import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum DeckStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
}

export enum DeckMode {
  LIST = 'list',
  GRAPH = 'graph',
}

export type DeckGraphPreview = {
  version: 1;
  kind: 'graph';
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
  nodeCount: number;
  connectionCount: number;
  nodes: Array<{ x: number; y: number; t: 'book' | 'card' }>;
  edges: Array<{ sx: number; sy: number; tx: number; ty: number }>;
};

export type DeckListPreview = {
  version: 1;
  kind: 'list';
  itemCount: number;
  items: Array<{
    t: 'insight' | 'change' | 'action' | 'question';
    title: string;
    cover: string | null;
    book: string | null;
  }>;
};

export type DeckPreview = DeckGraphPreview | DeckListPreview;

@Entity()
export class Deck extends BaseTable {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255, default: 'Untitled Deck' })
  name: string;

  @Column()
  userId: number;

  @ManyToOne(() => User, (user) => user.decks, { onDelete: 'CASCADE' })
  user: User;

  @Column({ type: 'enum', enum: DeckStatus, default: DeckStatus.DRAFT })
  status: DeckStatus;

  @Column({ type: 'enum', enum: DeckMode, default: DeckMode.GRAPH })
  mode: DeckMode;

  @Column({ type: 'jsonb', nullable: true })
  preview: DeckPreview | null;

  @Column({ type: 'timestamptz', nullable: true })
  previewUpdatedAt: Date | null;

  @OneToMany(() => DeckNode, (node) => node.deck)
  nodes: DeckNode[];

  @OneToMany(() => DeckConnection, (conn) => conn.deck)
  connections: DeckConnection[];
}
