import { BaseTable } from 'src/common/entity/base-table.entity';
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
@Index(['createdAt'])
@Index(['userId'])
export class Feedback extends BaseTable {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  userId: number | null;

  @Column({ type: 'varchar', length: 16, nullable: true })
  category: 'problem' | 'suggestion' | 'other' | null;

  @Column({ type: 'varchar', length: 254, nullable: true })
  replyEmail: string | null;

  @Column({ type: 'text' })
  message: string;

  @Column({ length: 255, nullable: true })
  pagePath: string | null;
}
