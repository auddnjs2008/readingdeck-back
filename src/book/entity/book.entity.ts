import { Card } from 'src/card/entity/card.entity';
import { BaseTable } from 'src/common/entity/base-table.entity';
import { User } from 'src/user/entity/user.entity';
import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

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

  @ManyToOne(() => User, (user) => user.books, { onDelete: 'CASCADE' })
  user: User;

  @OneToMany(() => Card, (card) => card.book)
  cards: Card[];
}
