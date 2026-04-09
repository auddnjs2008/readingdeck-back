import { BaseTable } from 'src/common/entity/base-table.entity';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AiChatThread } from './ai-chat-thread.entity';

export enum AiChatMessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
}

@Entity()
export class AiChatMessage extends BaseTable {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index()
  threadId: string;

  @ManyToOne(() => AiChatThread, (thread) => thread.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'threadId' })
  thread: AiChatThread;

  @Column({ type: 'enum', enum: AiChatMessageRole })
  role: AiChatMessageRole;

  @Column({ type: 'text' })
  content: string;
}
