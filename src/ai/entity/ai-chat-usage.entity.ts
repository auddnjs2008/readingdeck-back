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
@Index('IDX_ai_chat_usage_userId_date', ['userId', 'date'], { unique: true })
export class AiChatUsage extends BaseTable {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index()
  userId: number;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'integer', default: 0 })
  count: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
