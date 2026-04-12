import { BaseTable } from 'src/common/entity/base-table.entity';
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class AiHelpDocument extends BaseTable {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 120, unique: true })
  @Index()
  slug: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  summary: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar', length: 64 })
  contentHash: string;

  @Column({ type: 'varchar', length: 100 })
  embeddingModel: string;

  @Column({
    type: 'vector' as never,
    length: 1536,
  })
  embedding: number[];
}
