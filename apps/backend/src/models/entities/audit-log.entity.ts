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

@Entity('audit_logs')
@Index('IDX_audit_logs_tenant_created', ['tenantId', 'createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36 })
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'actor_user_id', type: 'varchar', length: 36, nullable: true })
  actorUserId!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'actor_user_id' })
  actorUser!: User | null;

  @Column({ name: 'action_type', type: 'varchar', length: 128 })
  actionType!: string;

  @Column({ name: 'target_type', type: 'varchar', length: 128 })
  targetType!: string;

  @Column({ name: 'target_id', type: 'varchar', length: 128, nullable: true })
  targetId!: string | null;

  @Column({ name: 'metadata_json', type: 'json', nullable: true })
  metadataJson!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
