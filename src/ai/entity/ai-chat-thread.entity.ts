import { BaseTable } from 'src/common/entity/base-table.entity';
import { User } from 'src/user/entity/user.entity';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AiChatMessage } from './ai-chat-message.entity';

@Entity()
export class AiChatThread extends BaseTable {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => AiChatMessage, (message) => message.thread)
  messages: AiChatMessage[];
}
