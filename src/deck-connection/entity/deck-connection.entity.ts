import { BaseTable } from 'src/common/entity/base-table.entity';
import { DeckNode } from 'src/deck-node/entity/deck-node.entity';
import { Deck } from 'src/deck/entity/deck.entity';
import {
  Column,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

@Entity()
@Index(['deckId'])
@Unique(['deckId', 'fromNodeId', 'toNodeId'])
export class DeckConnection extends BaseTable {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  deckId: number;

  @ManyToOne(() => Deck, (deck) => deck.connections, { onDelete: 'CASCADE' })
  deck: Deck;

  @Column()
  fromNodeId: number;

  @ManyToOne(() => DeckNode)
  fromNode: DeckNode;

  @Column()
  toNodeId: number;

  @ManyToOne(() => DeckNode)
  toNode: DeckNode;

  @Column({ length: 50, nullable: true })
  type: string | null;

  @Column({ type: 'json', nullable: true })
  style: { stroke?: string; strokeWidth?: number } | null;

  @Column({ default: false })
  animated: boolean;

  @Column({ type: 'json', nullable: true })
  markerEnd: { type?: string } | null;

  @Column({ length: 100, nullable: true })
  sourceHandle: string | null;

  @Column({ length: 100, nullable: true })
  targetHandle: string | null;

  @Column({ length: 255, nullable: true })
  label: string | null;
}
