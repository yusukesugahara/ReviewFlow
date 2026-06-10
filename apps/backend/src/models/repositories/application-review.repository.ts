import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import {
  ApplicationApprovalAction,
  type ApplicationApprovalActionValue,
} from '../constants/application-approval-action';
import { CorrectionRequestStatus } from '../constants/correction-request-status';
import { ApplicationApproval } from '../entities/application-approval.entity';
import { Application } from '../entities/application.entity';
import { CorrectionRequestItem } from '../entities/correction-request-item.entity';
import { CorrectionRequest } from '../entities/correction-request.entity';

@Injectable()
export class ApplicationReviewRepository {
  constructor(
    @InjectRepository(Application)
    private readonly apps: Repository<Application>,
  ) {}

  async saveApproval(params: {
    app: Application;
    approvalStepId: string;
    actorId: string;
    action: ApplicationApprovalActionValue;
    comment: string | null;
  }): Promise<void> {
    await this.apps.manager.transaction(async (em: EntityManager) => {
      const approvalRepo = em.getRepository(ApplicationApproval);
      const appRepo = em.getRepository(Application);
      await approvalRepo.save(
        approvalRepo.create({
          tenantId: params.app.tenantId,
          applicationId: params.app.id,
          approvalStepId: params.approvalStepId,
          actedByUserId: params.actorId,
          action: params.action,
          comment: params.comment,
        }),
      );
      await appRepo.save(params.app);
    });
  }

  async saveReturnForCorrection(params: {
    app: Application;
    approvalStepId: string;
    actorId: string;
    overallComment: string | null;
    fields: Array<{ fieldId: string; comment: string | null }>;
  }): Promise<void> {
    await this.apps.manager.transaction(async (em: EntityManager) => {
      const approvalRepo = em.getRepository(ApplicationApproval);
      const corrRepo = em.getRepository(CorrectionRequest);
      const itemRepo = em.getRepository(CorrectionRequestItem);
      const appRepo = em.getRepository(Application);

      await approvalRepo.save(
        approvalRepo.create({
          tenantId: params.app.tenantId,
          applicationId: params.app.id,
          approvalStepId: params.approvalStepId,
          actedByUserId: params.actorId,
          action: ApplicationApprovalAction.RETURNED,
          comment: params.overallComment,
        }),
      );

      const correction = await corrRepo.save(
        corrRepo.create({
          tenantId: params.app.tenantId,
          applicationId: params.app.id,
          requestedByUserId: params.actorId,
          status: CorrectionRequestStatus.OPEN,
          overallComment: params.overallComment,
          resolvedAt: null,
        }),
      );

      for (const row of params.fields) {
        await itemRepo.save(
          itemRepo.create({
            tenantId: params.app.tenantId,
            correctionRequestId: correction.id,
            formFieldId: row.fieldId,
            comment: row.comment,
            isResolved: false,
          }),
        );
      }

      await appRepo.save(params.app);
    });
  }
}
