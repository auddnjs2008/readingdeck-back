import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Card } from './card.entity';

export const REACTIONS = ['agree', 'changed', 'tried', 'pondering'] as const;
export type Reaction = (typeof REACTIONS)[number];

@Entity()
@Index('IDX_reflection_card_id', ['cardId', 'id'])
@Unique('UQ_reflection_request', ['cardId', 'requestId'])
export class CardReflection {
  @PrimaryGeneratedColumn() id: number;
  @Column() cardId: number;
  @ManyToOne(() => Card, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cardId' })
  card: Card;
  @Column({ type: 'varchar', length: 20 }) reaction: Reaction;
  @Column({ type: 'varchar', length: 500, nullable: true }) note: string | null;
  @Column({ type: 'uuid' }) requestId: string;
  @CreateDateColumn() createdAt: Date;
}
