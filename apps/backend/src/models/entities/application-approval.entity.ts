import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { ApplicationApprovalActionValue } from '../constants/application-approval-action';
import { Tenant } from './tenant.entity';
import { Application } from './application.entity';
import { ApprovalStep } from './approval-step.entity';
import { User } from './user.entity';

@Entity('application_approvals')
@Index('IDX_application_approvals_app', ['applicationId'])
export class ApplicationApproval {
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

  @Column({ name: 'approval_step_id', type: 'uuid' })
  approvalStepId!: string;

  @ManyToOne(() => ApprovalStep, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'approval_step_id' })
  approvalStep!: ApprovalStep;

  @Column({ name: 'acted_by_user_id', type: 'uuid' })
  actedByUserId!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'acted_by_user_id' })
  actedBy!: User;

  @Column({ type: 'varchar', length: 32 })
  action!: ApplicationApprovalActionValue;

  @Column({ type: 'varchar', length: 4000, nullable: true })
  comment!: string | null;

  @CreateDateColumn({ name: 'acted_at' })
  actedAt!: Date;
}
