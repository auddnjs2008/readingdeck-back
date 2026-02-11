import { Book } from 'src/book/entity/book.entity';
import { BaseTable } from 'src/common/entity/base-table.entity';
import { DeckNode } from 'src/deck-node/entity/deck-node.entity';
import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum CardType {
  INSIGHT = 'insight',
  CHANGE = 'change',
  ACTION = 'action',
  QUESTION = 'question',
}

@Entity()
export class Card extends BaseTable {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: CardType })
  type: CardType;

  @Column({ type: 'text', nullable: true })
  quote?: string;

  @Column({ type: 'text' })
  thought: string;

  @Column({ nullable: true })
  backgroundImage?: string;

  @ManyToOne(() => Book, (book) => book.cards)
  book: Book;

  @Column({ nullable: true })
  pageStart: number;

  @Column({ nullable: true })
  pageEnd: number;

  @OneToMany(() => DeckNode, (deckNode) => deckNode.card)
  deckNodes: DeckNode[];
}
