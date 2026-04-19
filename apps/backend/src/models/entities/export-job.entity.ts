import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { ExportJobStatusValue } from '../constants/export-job-status';
import { Tenant } from './tenant.entity';
import { User } from './user.entity';

@Entity('export_jobs')
@Index('IDX_export_jobs_tenant_status_created', ['tenantId', 'status', 'createdAt'])
export class ExportJob {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36 })
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'requested_by_user_id', type: 'varchar', length: 36 })
  requestedByUserId!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'requested_by_user_id' })
  requestedBy!: User;

  @Column({ type: 'varchar', length: 32 })
  status!: ExportJobStatusValue;

  @Column({ name: 'filter_json', type: 'json', nullable: true })
  filterJson!: Record<string, unknown> | null;

  @Column({ name: 'file_path', type: 'varchar', length: 1000, nullable: true })
  filePath!: string | null;

  @Column({ name: 'started_at', type: 'datetime', nullable: true })
  startedAt!: Date | null;

  @Column({ name: 'finished_at', type: 'datetime', nullable: true })
  finishedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
