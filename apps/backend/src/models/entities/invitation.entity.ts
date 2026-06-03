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
import type { GroupMemberRoleValue } from '../constants/group-member-role';
import type { UserRoleValue } from '../constants/user-role';
import { Group } from './group.entity';
import { Tenant } from './tenant.entity';
import { User } from './user.entity';

@Entity('invitations')
@Index('IDX_invitations_tenant_email', ['tenantId', 'email'])
export class Invitation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ type: 'varchar', length: 32 })
  role!: UserRoleValue;

  @Column({ name: 'group_id', type: 'uuid', nullable: true })
  groupId!: string | null;

  @ManyToOne(() => Group, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'group_id' })
  group!: Group | null;

  @Column({
    name: 'group_role',
    type: 'varchar',
    length: 32,
    nullable: true,
  })
  groupRole!: GroupMemberRoleValue | null;

  @Column({ type: 'varchar', length: 64, unique: true })
  token!: string;

  @Column({ type: 'varchar', length: 32, default: InvitationStatus.PENDING })
  status!: InvitationStatusValue;

  @Column({ name: 'invited_by_user_id', type: 'uuid' })
  invitedByUserId!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'invited_by_user_id' })
  invitedBy!: User;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
