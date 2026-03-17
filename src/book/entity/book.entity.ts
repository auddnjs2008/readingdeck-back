import { Card } from 'src/card/entity/card.entity';
import { BaseTable } from 'src/common/entity/base-table.entity';
import { DeckNode } from 'src/deck-node/entity/deck-node.entity';
import { User } from 'src/user/entity/user.entity';
import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum BookStatus {
  READING = 'reading',
  FINISHED = 'finished',
  PAUSED = 'paused',
}

@Entity()
export class Book extends BaseTable {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column()
  author: string;

  @Column({ nullable: true })
  contents: string;

  @Column()
  publisher: string;

  @Column({ nullable: true })
  backgroundImage?: string;

  @Column({ type: 'enum', enum: BookStatus, default: BookStatus.PAUSED })
  status: BookStatus;

  @Column({ type: 'integer', nullable: true })
  currentPage: number | null;

  @Column({ type: 'integer', nullable: true })
  totalPages: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  finishedAt: Date | null;

  @ManyToOne(() => User, (user) => user.books, { onDelete: 'CASCADE' })
  user: User;

  @OneToMany(() => Card, (card) => card.book)
  cards: Card[];

  @OneToMany(() => DeckNode, (deckNode) => deckNode.book)
  deckNodes: DeckNode[];
}
