import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  TenantPlan,
  TenantStatus,
  type TenantPlanValue,
  type TenantStatusValue,
} from '../constants/tenant-enums';

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 32, default: TenantPlan.FREE })
  plan!: TenantPlanValue;

  @Column({ type: 'varchar', length: 32, default: TenantStatus.TRIAL })
  status!: TenantStatusValue;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
