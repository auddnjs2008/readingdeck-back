import { BaseTable } from 'src/common/entity/base-table.entity';
import { Column, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';

export enum AuthProvider {
  GOOGLE = 'google',
}

@Entity()
@Unique(['provider', 'providerUserId'])
export class User extends BaseTable {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50 })
  name: string;

  @Column({ nullable: true, length: 255 })
  email: string | null;

  @Column({ type: 'enum', enum: AuthProvider })
  provider: AuthProvider;

  @Column({ length: 100 })
  @Index()
  providerUserId: string;
}
