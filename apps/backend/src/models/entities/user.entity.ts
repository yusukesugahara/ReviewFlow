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
import type { UserRoleValue } from '../constants/user-role';
import { Tenant } from './tenant.entity';

@Entity('users')
@Index('UQ_users_tenant_email', ['tenantId', 'email'], { unique: true })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name!: string | null;

  @Column()
  email!: string;

  @Column({ name: 'password_hash' })
  passwordHash!: string;

  @Column({ type: 'varchar', length: 32 })
  role!: UserRoleValue;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
