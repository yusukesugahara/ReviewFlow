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
import type { FormDefinitionStatusValue } from '../constants/form-definition-status';
import { FormDefinitionStatus } from '../constants/form-definition-status';
import { Tenant } from './tenant.entity';
import { User } from './user.entity';
import { FormField } from './form-field.entity';
import { Group } from './group.entity';

@Entity('form_definitions')
@Index('IDX_form_definitions_tenant', ['tenantId'])
@Index('IDX_form_definitions_tenant_group', ['tenantId', 'groupId'])
export class FormDefinition {
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

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 2000, nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 32, default: FormDefinitionStatus.DRAFT })
  status!: FormDefinitionStatusValue;

  @Column({
    name: 'archived_from_status',
    type: 'varchar',
    length: 32,
    nullable: true,
  })
  archivedFromStatus!: FormDefinitionStatusValue | null;

  @Column({ name: 'created_by_user_id', type: 'varchar', length: 36 })
  createdByUserId!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by_user_id' })
  createdBy!: User;

  @OneToMany(() => FormField, (f) => f.formDefinition)
  fields!: FormField[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
