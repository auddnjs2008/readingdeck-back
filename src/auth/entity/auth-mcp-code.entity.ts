import { AuthProvider } from 'src/user/entity/user.entity';
import { BaseTable } from 'src/common/entity/base-table.entity';
import {
  Column,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from 'src/user/entity/user.entity';

@Entity()
export class AuthMcpCode extends BaseTable {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 64, unique: true })
  @Index()
  codeHash: string;

  @Column()
  @Index()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column({ type: 'enum', enum: AuthProvider })
  provider: AuthProvider;

  @Column({ length: 500 })
  redirectUri: string;

  @Column({ type: 'timestamp' })
  @Index()
  expiresAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  usedAt: Date | null;
}
