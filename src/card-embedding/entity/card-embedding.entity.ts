import { Book } from 'src/book/entity/book.entity';
import { Card } from 'src/card/entity/card.entity';
import { BaseTable } from 'src/common/entity/base-table.entity';
import { User } from 'src/user/entity/user.entity';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class CardEmbedding extends BaseTable {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index({ unique: true })
  cardId: number;

  @Column()
  @Index()
  userId: number;

  @Column({ nullable: true })
  @Index()
  bookId: number;

  @Column({ type: 'text' })
  content: string;

  @Column({ length: 100 })
  embeddingModel: string;

  @Column({
    type: 'vector' as any,
    length: 1536,
  })
  embedding: number[];

  @ManyToOne(() => Card, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cardId' })
  card: Card;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Book, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'bookId' })
  book: Book | null;
}
