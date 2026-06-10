import { Injectable } from '@nestjs/common';
import { Application } from '../../../../models/entities/application.entity';
import { ApplicationProgressRepository } from '../../../../models/repositories/application-progress.repository';
import type { ApplicationWithProgress } from '../mappers/applications.mapper';
import { ApplicationProgressBuilder } from './application-progress.builder';

@Injectable()
export class ApplicationProgressService {
  constructor(
    private readonly progressRepository: ApplicationProgressRepository,
    private readonly progressBuilder: ApplicationProgressBuilder,
  ) {}

  async hydrate(row: Application): Promise<ApplicationWithProgress> {
    const steps = this.progressBuilder.getOrderedSteps(row);
    if (steps.length === 0) {
      return Object.assign(row, { approvalProgress: [] });
    }

    const approvals = await this.progressRepository.findApprovalsForProgress({
      tenantId: row.tenantId,
      applicationId: row.id,
    });
    const users = await this.progressRepository.findUsersByIdsInTenant(
      row.tenantId,
      this.progressBuilder.collectUserIds(row, approvals),
    );
    const approvalProgress = this.progressBuilder.build(row, approvals, users);

    return Object.assign(row, { approvalProgress });
  }
}
