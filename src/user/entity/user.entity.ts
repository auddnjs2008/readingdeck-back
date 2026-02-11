import { Book } from 'src/book/entity/book.entity';
import { BaseTable } from 'src/common/entity/base-table.entity';
import { Deck } from 'src/deck/entity/deck.entity';
import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

export enum AuthProvider {
  GOOGLE = 'google',
}

@Entity()
@Unique(['provider', 'providerUserId'])
export class User extends BaseTable {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50 })
  name: string;

  @Column({ nullable: true, length: 255 })
  email: string | null;

  @Column({ type: 'enum', enum: AuthProvider })
  provider: AuthProvider;

  @Column({ nullable: true })
  profile?: string;

  @Column({ length: 100 })
  @Index()
  providerUserId: string;

  @OneToMany(() => Book, (book) => book.user)
  books: Book[];

  @OneToMany(() => Deck, (deck) => deck.user)
  decks: Deck[];
}
