import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { User } from './user.entity';
import { Group } from './group.entity';
import type { ApplicationStatusValue } from '../constants/application-status';
import type { UserRoleValue } from '../constants/user-role';
import type { GroupMemberRoleValue } from '../constants/group-member-role';

export type AuditActorType = 'user' | 'applicant' | 'system';
export type AuditOutcome = 'success' | 'failure';

export type AuditEventActor = {
  id: string | null;
  type: string;
  email?: string | null;
  label?: string | null;
};

export type AuditEventResource = {
  id: string | null;
  type: string;
  label?: string | null;
};

export type AuditEventChange = {
  field: string;
  from: unknown;
  to: unknown;
};

@Entity('audit_logs')
@Index('IDX_audit_logs_tenant_created', ['tenantId', 'createdAt'])
@Index('IDX_audit_logs_tenant_group_created', [
  'tenantId',
  'groupId',
  'createdAt',
])
@Index('IDX_audit_logs_tenant_resource_created', [
  'tenantId',
  'resourceType',
  'createdAt',
])
@Index('IDX_audit_logs_tenant_scope_created', [
  'tenantId',
  'scopeType',
  'scopeId',
  'createdAt',
])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'group_id', type: 'uuid', nullable: true })
  groupId!: string | null;

  @ManyToOne(() => Group, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'group_id' })
  group!: Group | null;

  @Column({
    name: 'actor_user_id',
    type: 'uuid',
    nullable: true,
  })
  actorUserId!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'actor_user_id' })
  actorUser!: User | null;

  @Column({ name: 'actor_type', type: 'varchar', length: 32, default: 'user' })
  actorType!: AuditActorType;

  @Column({
    name: 'actor_email_snapshot',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  actorEmailSnapshot!: string | null;

  @Column({ name: 'action_type', type: 'varchar', length: 128 })
  actionType!: string;

  @Column({ name: 'target_type', type: 'varchar', length: 128 })
  targetType!: string;

  @Column({ name: 'target_id', type: 'varchar', length: 128, nullable: true })
  targetId!: string | null;

  @Column({ name: 'scope_type', type: 'varchar', length: 32, nullable: true })
  scopeType!: string | null;

  @Column({ name: 'scope_id', type: 'varchar', length: 128, nullable: true })
  scopeId!: string | null;

  @Column({
    name: 'resource_type',
    type: 'varchar',
    length: 128,
    nullable: true,
  })
  resourceType!: string | null;

  @Column({ name: 'resource_id', type: 'varchar', length: 128, nullable: true })
  resourceId!: string | null;

  @Column({
    name: 'resource_label_snapshot',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  resourceLabelSnapshot!: string | null;

  @Column({ name: 'operation', type: 'varchar', length: 64, nullable: true })
  operation!: string | null;

  @Column({
    name: 'outcome',
    type: 'varchar',
    length: 32,
    default: 'success',
  })
  outcome!: AuditOutcome;

  @Column({ name: 'actor_json', type: 'json', nullable: true })
  actorJson!: AuditEventActor | null;

  @Column({ name: 'resource_json', type: 'json', nullable: true })
  resourceJson!: AuditEventResource | null;

  @Column({ name: 'changes_json', type: 'json', nullable: true })
  changesJson!: AuditEventChange[] | null;

  @Column({ name: 'target_user_id', type: 'uuid', nullable: true })
  targetUserId!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'target_user_id' })
  targetUser!: User | null;

  @Column({
    name: 'target_email_snapshot',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  targetEmailSnapshot!: string | null;

  @Column({ name: 'application_id', type: 'uuid', nullable: true })
  applicationId!: string | null;

  @Column({
    name: 'status_from',
    type: 'varchar',
    length: 32,
    nullable: true,
  })
  statusFrom!: ApplicationStatusValue | null;

  @Column({
    name: 'status_to',
    type: 'varchar',
    length: 32,
    nullable: true,
  })
  statusTo!: ApplicationStatusValue | null;

  @Column({ name: 'step_order_from', type: 'int', nullable: true })
  stepOrderFrom!: number | null;

  @Column({ name: 'step_order_to', type: 'int', nullable: true })
  stepOrderTo!: number | null;

  @Column({ name: 'role_from', type: 'varchar', length: 32, nullable: true })
  roleFrom!: UserRoleValue | null;

  @Column({ name: 'role_to', type: 'varchar', length: 32, nullable: true })
  roleTo!: UserRoleValue | null;

  @Column({
    name: 'group_role_from',
    type: 'varchar',
    length: 32,
    nullable: true,
  })
  groupRoleFrom!: GroupMemberRoleValue | null;

  @Column({
    name: 'group_role_to',
    type: 'varchar',
    length: 32,
    nullable: true,
  })
  groupRoleTo!: GroupMemberRoleValue | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  summary!: string | null;

  @Column({ name: 'metadata_json', type: 'json', nullable: true })
  metadataJson!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
