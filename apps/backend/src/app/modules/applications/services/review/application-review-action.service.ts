import { Injectable } from '@nestjs/common';
import { ApplicationApprovalAction } from '../../../../../models/constants/application-approval-action';
import { Application } from '../../../../../models/entities/application.entity';
import { FormDefinition } from '../../../../../models/entities/form-definition.entity';
import { ApplicationReviewRepository } from '../../../../../models/repositories/application-review.repository';
import type {
  ApproveApplicationDto,
  RejectApplicationDto,
  ReturnApplicationDto,
} from '../../dto/applications.dto';
import { ApplicationTransitionPolicy } from '../../policies/application-transition.policy';
import { ApplicationReturnForCorrectionContextLoader } from './application-return-for-correction-context.loader';

@Injectable()
export class ApplicationReviewActionService {
  constructor(
    private readonly returnContextLoader: ApplicationReturnForCorrectionContextLoader,
    private readonly reviewRepository: ApplicationReviewRepository,
    private readonly transitionPolicy: ApplicationTransitionPolicy,
  ) {}

  async approve(
    app: Application,
    actorId: string,
    dto: ApproveApplicationDto,
  ): Promise<void> {
    const cur = this.transitionPolicy.getCurrentStep(app);
    const next = this.transitionPolicy.getNextStep(app, cur);
    const comment = this.trimComment(dto.comment);

    this.transitionPolicy.applyApproval(app, next);
    await this.reviewRepository.saveApproval({
      app,
      approvalStepId: cur.id,
      actorId,
      action: ApplicationApprovalAction.APPROVED,
      comment,
    });
  }

  async reject(
    app: Application,
    actorId: string,
    dto: RejectApplicationDto,
  ): Promise<void> {
    const cur = this.transitionPolicy.getCurrentStep(app);
    const comment = this.trimComment(dto.comment);

    this.transitionPolicy.applyReject(app);
    await this.reviewRepository.saveApproval({
      app,
      approvalStepId: cur.id,
      actorId,
      action: ApplicationApprovalAction.REJECTED,
      comment,
    });
  }

  async returnForCorrection(
    app: Application,
    actorId: string,
    dto: ReturnApplicationDto,
  ): Promise<FormDefinition> {
    const context = await this.returnContextLoader.load(app, dto);
    const overall = this.trimComment(dto.overallComment);

    this.transitionPolicy.applyReturn(app);
    await this.reviewRepository.saveReturnForCorrection({
      app,
      approvalStepId: context.currentStep.id,
      actorId,
      overallComment: overall,
      fields: dto.fields.map((field) => ({
        fieldId: field.fieldId,
        comment: this.trimComment(field.comment),
      })),
    });

    return context.template;
  }

  private trimComment(value: string | undefined): string | null {
    return value?.trim().length ? value.trim() : null;
  }
}
