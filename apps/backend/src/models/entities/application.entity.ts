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
import type { ApplicationStatusValue } from '../constants/application-status';
import { Tenant } from './tenant.entity';
import { FormTemplate } from './form-template.entity';
import { ApprovalFlow } from './approval-flow.entity';
import { ApplicationFieldValue } from './application-field-value.entity';
import { User } from './user.entity';

@Entity('applications')
@Index('IDX_applications_tenant_status_created', [
  'tenantId',
  'status',
  'createdAt',
])
export class Application {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36 })
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({
    name: 'applicant_user_id',
    type: 'varchar',
    length: 36,
    nullable: true,
  })
  applicantUserId!: string | null;

  @ManyToOne(() => User, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'applicant_user_id' })
  applicantUser!: User | null;

  @Column({ name: 'applicant_email', type: 'varchar', length: 255 })
  applicantEmail!: string;

  @Column({ name: 'form_template_id', type: 'varchar', length: 36 })
  formTemplateId!: string;

  @ManyToOne(() => FormTemplate, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'form_template_id' })
  formTemplate!: FormTemplate;

  @Column({ name: 'approval_flow_id', type: 'varchar', length: 36 })
  approvalFlowId!: string;

  @ManyToOne(() => ApprovalFlow, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'approval_flow_id' })
  approvalFlow!: ApprovalFlow;

  @Column({ name: 'current_step_order', type: 'int', nullable: true })
  currentStepOrder!: number | null;

  @Column({ type: 'varchar', length: 32 })
  status!: ApplicationStatusValue;

  @Column({ name: 'submitted_at', type: 'datetime', nullable: true })
  submittedAt!: Date | null;

  @OneToMany(() => ApplicationFieldValue, (v) => v.application)
  fieldValues!: ApplicationFieldValue[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
