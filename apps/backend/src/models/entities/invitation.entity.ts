import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { InvitationStatusValue } from '../constants/invitation-status';
import { InvitationStatus } from '../constants/invitation-status';
import type { UserRoleValue } from '../constants/user-role';
import { Tenant } from './tenant.entity';
import { User } from './user.entity';

@Entity('invitations')
@Index('IDX_invitations_tenant_email', ['tenantId', 'email'])
export class Invitation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36 })
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ type: 'varchar', length: 32 })
  role!: UserRoleValue;

  @Column({ type: 'varchar', length: 64, unique: true })
  token!: string;

  @Column({ type: 'varchar', length: 32, default: InvitationStatus.PENDING })
  status!: InvitationStatusValue;

  @Column({ name: 'invited_by_user_id', type: 'varchar', length: 36 })
  invitedByUserId!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'invited_by_user_id' })
  invitedBy!: User;

  @Column({ name: 'expires_at', type: 'datetime' })
  expiresAt!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
