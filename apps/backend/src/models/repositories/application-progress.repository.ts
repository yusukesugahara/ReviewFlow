import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ApplicationApproval } from '../entities/application-approval.entity';
import { User } from '../entities/user.entity';

@Injectable()
export class ApplicationProgressRepository {
  constructor(
    @InjectRepository(ApplicationApproval)
    private readonly approvals: Repository<ApplicationApproval>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  findApprovalsForProgress(params: {
    tenantId: string;
    applicationId: string;
  }): Promise<ApplicationApproval[]> {
    return this.approvals.find({
      where: {
        tenantId: params.tenantId,
        applicationId: params.applicationId,
      },
      relations: ['actedBy'],
      order: { actedAt: 'ASC' },
    });
  }

  findUsersByIdsInTenant(tenantId: string, ids: string[]): Promise<User[]> {
    return this.users.find({
      where: { tenantId, id: In(ids) },
    });
  }
}
