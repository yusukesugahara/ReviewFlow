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
import { Application } from './application.entity';
import { FormField } from './form-field.entity';

@Entity('application_field_values')
@Index('UQ_app_field_values_app_field', ['applicationId', 'formFieldId'], {
  unique: true,
})
export class ApplicationFieldValue {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'application_id', type: 'uuid' })
  applicationId!: string;

  @ManyToOne(() => Application, (a) => a.fieldValues, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'application_id' })
  application!: Application;

  @Column({ name: 'form_field_id', type: 'uuid' })
  formFieldId!: string;

  @ManyToOne(() => FormField, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'form_field_id' })
  formField!: FormField;

  @Column({ name: 'value_json', type: 'json' })
  valueJson!: unknown;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
