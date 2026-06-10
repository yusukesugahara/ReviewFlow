import { Injectable } from '@nestjs/common';
import { ClientErrorCodes, clientError } from '../../../../common/errors';
import { ApplicationApprovalAction } from '../../../../models/constants/application-approval-action';
import { Application } from '../../../../models/entities/application.entity';
import { CorrectionRequest } from '../../../../models/entities/correction-request.entity';
import { FormDefinition } from '../../../../models/entities/form-definition.entity';
import { ApplicationReviewRepository } from '../../../../models/repositories/application-review.repository';
import { ApplicationsRepository } from '../../../../models/repositories/applications.repository';
import type {
  ApproveApplicationDto,
  RejectApplicationDto,
  ReturnApplicationDto,
} from '../dto/applications.dto';
import { ApplicationTransitionPolicy } from '../policies/application-transition.policy';

@Injectable()
export class ApplicationReviewActionService {
  constructor(
    private readonly applicationsRepository: ApplicationsRepository,
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
    const cur = this.transitionPolicy.getCurrentStep(app);
    this.transitionPolicy.assertStepCanReturn(cur);

    const existingOpen = await this.findOpenCorrection(app.id);
    if (existingOpen) {
      throw clientError(ClientErrorCodes.APPLICATION_CORRECTION_ALREADY_OPEN);
    }

    const template = await this.applicationsRepository.findTemplateByIdInGroup({
      tenantId: app.tenantId,
      groupId: app.groupId,
      formDefinitionId: app.formDefinitionId,
    });
    if (!template) {
      throw clientError(ClientErrorCodes.FORM_DEFINITION_NOT_FOUND);
    }
    this.assertReturnFieldsBelongToTemplate(template, dto);

    const overall = this.trimComment(dto.overallComment);

    this.transitionPolicy.applyReturn(app);
    await this.reviewRepository.saveReturnForCorrection({
      app,
      approvalStepId: cur.id,
      actorId,
      overallComment: overall,
      fields: dto.fields.map((field) => ({
        fieldId: field.fieldId,
        comment: this.trimComment(field.comment),
      })),
    });

    return template;
  }

  private async findOpenCorrection(
    applicationId: string,
  ): Promise<CorrectionRequest | null> {
    return this.applicationsRepository.findOpenCorrection(applicationId);
  }

  private assertReturnFieldsBelongToTemplate(
    template: FormDefinition,
    dto: ReturnApplicationDto,
  ): void {
    const fieldIdsOnTemplate = new Set(
      (template.fields ?? []).map((field) => field.id),
    );

    for (const field of dto.fields) {
      if (!fieldIdsOnTemplate.has(field.fieldId)) {
        throw clientError(ClientErrorCodes.APPLICATION_RETURN_FIELDS_INVALID);
      }
    }
  }

  private trimComment(value: string | undefined): string | null {
    return value?.trim().length ? value.trim() : null;
  }
}
