import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { CorrectionRequestStatusValue } from '../constants/correction-request-status';
import { Tenant } from './tenant.entity';
import { Application } from './application.entity';
import { User } from './user.entity';
import { CorrectionRequestItem } from './correction-request-item.entity';

@Entity('correction_requests')
@Index('IDX_correction_requests_app', ['applicationId'])
@Index(
  'UQ_correction_requests_open_application',
  ['tenantId', 'applicationId'],
  {
    unique: true,
    where: `"status" = 'open'`,
  },
)
export class CorrectionRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'application_id', type: 'uuid' })
  applicationId!: string;

  @ManyToOne(() => Application, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'application_id' })
  application!: Application;

  @Column({ name: 'requested_by_user_id', type: 'uuid' })
  requestedByUserId!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'requested_by_user_id' })
  requestedBy!: User;

  @Column({ type: 'varchar', length: 32 })
  status!: CorrectionRequestStatusValue;

  @Column({
    name: 'overall_comment',
    type: 'varchar',
    length: 4000,
    nullable: true,
  })
  overallComment!: string | null;

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt!: Date | null;

  @OneToMany(() => CorrectionRequestItem, (i) => i.correctionRequest)
  items!: CorrectionRequestItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
