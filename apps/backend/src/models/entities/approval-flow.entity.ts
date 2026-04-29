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
import { FormTemplate } from './form-template.entity';
import { ApprovalStep } from './approval-step.entity';
import { Group } from './group.entity';

@Entity('approval_flows')
@Index('IDX_approval_flows_tenant', ['tenantId'])
@Index('IDX_approval_flows_tenant_group', ['tenantId', 'groupId'])
@Index('IDX_approval_flows_template', ['formTemplateId'])
export class ApprovalFlow {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36 })
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'group_id', type: 'varchar', length: 36 })
  groupId!: string;

  @ManyToOne(() => Group, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'group_id' })
  group!: Group;

  @Column({ name: 'form_template_id', type: 'varchar', length: 36 })
  formTemplateId!: string;

  @ManyToOne(() => FormTemplate, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'form_template_id' })
  formTemplate!: FormTemplate;

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
