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
@Index(['deckId', 'clientKey'], { unique: true })
export class DeckNode extends BaseTable {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  deckId: number;

  @ManyToOne(() => Deck, (deck) => deck.nodes, { onDelete: 'CASCADE' })
  deck: Deck;

  @Column({ type: 'enum', enum: DeckNodeType })
  type: DeckNodeType;

  // React Flow 노드 id 같은 클라이언트 식별자 매핑용
  @Column({ length: 100, nullable: true })
  clientKey: string | null;

  @Column({ nullable: true })
  bookId: number | null;

  @ManyToOne(() => Book, { nullable: true, onDelete: 'SET NULL' })
  book: Book | null;

  @Column({ nullable: true })
  cardId: number | null;

  @ManyToOne(() => Card, { nullable: true, onDelete: 'SET NULL' })
  card: Card | null;

  @Column({ type: 'float', default: 0 })
  positionX: number;

  @Column({ type: 'float', default: 0 })
  positionY: number;

  @Column({ default: 0 })
  order: number;
}
