import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { ApproverStepRoleValue } from '../constants/approver-step-role';
import { Tenant } from './tenant.entity';
import { ApprovalFlow } from './approval-flow.entity';

@Entity('approval_steps')
@Index('UQ_approval_steps_flow_order', ['approvalFlowId', 'stepOrder'], {
  unique: true,
})
export class ApprovalStep {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36 })
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'approval_flow_id', type: 'varchar', length: 36 })
  approvalFlowId!: string;

  @ManyToOne(() => ApprovalFlow, (f) => f.steps, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'approval_flow_id' })
  approvalFlow!: ApprovalFlow;

  @Column({ name: 'step_order', type: 'int' })
  stepOrder!: number;

  @Column({ name: 'step_name', type: 'varchar', length: 255 })
  stepName!: string;

  @Column({ name: 'approver_role', type: 'varchar', length: 32 })
  approverRole!: ApproverStepRoleValue;

  @Column({ name: 'can_return', default: false })
  canReturn!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
