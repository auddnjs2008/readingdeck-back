import { Book } from 'src/book/entity/book.entity';
import { Card } from 'src/card/entity/card.entity';
import { BaseTable } from 'src/common/entity/base-table.entity';
import { Deck } from 'src/deck/entity/deck.entity';
import {
  Column,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum DeckNodeType {
  BOOK = 'book',
  CARD = 'card',
}

@Entity()
@Index(['deckId'])
export class DeckNode extends BaseTable {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  deckId: number;

  @ManyToOne(() => Deck, (deck) => deck.nodes, { onDelete: 'CASCADE' })
  deck: Deck;

  @Column({ type: 'enum', enum: DeckNodeType })
  type: DeckNodeType;

  @Column({ nullable: true })
  bookId: number | null;

  @ManyToOne(() => Book, { nullable: true })
  book: Book | null;

  @Column({ nullable: true })
  cardId: number | null;

  @ManyToOne(() => Card, { nullable: true })
  card: Card | null;

  @Column({ type: 'float', default: 0 })
  positionX: number;

  @Column({ type: 'float', default: 0 })
  positionY: number;

  @Column({ default: 0 })
  order: number;
}
