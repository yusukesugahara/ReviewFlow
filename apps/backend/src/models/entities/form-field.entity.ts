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
import type { FormFieldTypeValue } from '../constants/form-field-type';
import { Tenant } from './tenant.entity';
import { FormDefinition } from './form-definition.entity';

@Entity('form_fields')
@Index('UQ_form_fields_definition_key', ['formDefinitionId', 'fieldKey'], {
  unique: true,
})
@Index('IDX_form_fields_tenant_definition', ['tenantId', 'formDefinitionId'])
export class FormField {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36 })
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'form_definition_id', type: 'varchar', length: 36 })
  formDefinitionId!: string;

  @ManyToOne(() => FormDefinition, (t) => t.fields, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'form_definition_id' })
  formDefinition!: FormDefinition;

  @Column({ name: 'field_key', type: 'varchar', length: 128 })
  fieldKey!: string;

  @Column({ type: 'varchar', length: 255 })
  label!: string;

  @Column({ name: 'field_type', type: 'varchar', length: 32 })
  fieldType!: FormFieldTypeValue;

  @Column({ default: false })
  required!: boolean;

  @Column({ type: 'varchar', length: 500, nullable: true })
  placeholder!: string | null;

  @Column({ name: 'help_text', type: 'varchar', length: 2000, nullable: true })
  helpText!: string | null;

  @Column({ name: 'options_json', type: 'json', nullable: true })
  optionsJson!: unknown[] | null;

  @Column({ name: 'sort_order', type: 'int' })
  sortOrder!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
