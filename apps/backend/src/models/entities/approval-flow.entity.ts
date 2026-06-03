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
import { Tenant } from './tenant.entity';
import { ApprovalStep } from './approval-step.entity';
import { Group } from './group.entity';

@Entity('approval_flows')
@Index('IDX_approval_flows_tenant', ['tenantId'])
@Index('IDX_approval_flows_tenant_group', ['tenantId', 'groupId'])
export class ApprovalFlow {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'group_id', type: 'uuid' })
  groupId!: string;

  @ManyToOne(() => Group, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'group_id' })
  group!: Group;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @OneToMany(() => ApprovalStep, (s) => s.approvalFlow)
  steps!: ApprovalStep[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
