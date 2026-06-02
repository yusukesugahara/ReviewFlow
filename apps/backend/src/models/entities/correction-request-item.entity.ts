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
import { Tenant } from './tenant.entity';
import { CorrectionRequest } from './correction-request.entity';
import { FormField } from './form-field.entity';

@Entity('correction_request_items')
@Index('IDX_correction_request_items_request', ['correctionRequestId'])
export class CorrectionRequestItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36 })
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'correction_request_id', type: 'varchar', length: 36 })
  correctionRequestId!: string;

  @ManyToOne(() => CorrectionRequest, (r) => r.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'correction_request_id' })
  correctionRequest!: CorrectionRequest;

  @Column({ name: 'form_field_id', type: 'varchar', length: 36 })
  formFieldId!: string;

  @ManyToOne(() => FormField, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'form_field_id' })
  formField!: FormField;

  @Column({ type: 'varchar', length: 4000, nullable: true })
  comment!: string | null;

  @Column({ name: 'is_resolved', default: false })
  isResolved!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
