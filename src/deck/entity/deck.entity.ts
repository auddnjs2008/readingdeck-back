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

  @OneToMany(() => DeckNode, (node) => node.deck)
  nodes: DeckNode[];

  @OneToMany(() => DeckConnection, (conn) => conn.deck)
  connections: DeckConnection[];
}
