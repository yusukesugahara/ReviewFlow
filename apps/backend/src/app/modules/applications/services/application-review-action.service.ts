import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientErrorCodes, clientError } from '../../../../common/errors';
import { ApplicationApprovalAction } from '../../../../models/constants/application-approval-action';
import { CorrectionRequestStatus } from '../../../../models/constants/correction-request-status';
import { ApplicationApproval } from '../../../../models/entities/application-approval.entity';
import { Application } from '../../../../models/entities/application.entity';
import { CorrectionRequestItem } from '../../../../models/entities/correction-request-item.entity';
import { CorrectionRequest } from '../../../../models/entities/correction-request.entity';
import { FormDefinition } from '../../../../models/entities/form-definition.entity';
import type {
  ApproveApplicationDto,
  RejectApplicationDto,
  ReturnApplicationDto,
} from '../dto/applications.dto';
import { ApplicationTransitionPolicy } from '../policies/application-transition.policy';

@Injectable()
export class ApplicationReviewActionService {
  constructor(
    @InjectRepository(Application)
    private readonly apps: Repository<Application>,
    @InjectRepository(CorrectionRequest)
    private readonly correctionRequests: Repository<CorrectionRequest>,
    @InjectRepository(FormDefinition)
    private readonly templates: Repository<FormDefinition>,
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

    await this.apps.manager.transaction(async (em) => {
      const approvalRepo = em.getRepository(ApplicationApproval);
      const appRepo = em.getRepository(Application);
      await approvalRepo.save(
        approvalRepo.create({
          tenantId: app.tenantId,
          applicationId: app.id,
          approvalStepId: cur.id,
          actedByUserId: actorId,
          action: ApplicationApprovalAction.APPROVED,
          comment,
        }),
      );
      this.transitionPolicy.applyApproval(app, next);
      await appRepo.save(app);
    });
  }

  async reject(
    app: Application,
    actorId: string,
    dto: RejectApplicationDto,
  ): Promise<void> {
    const cur = this.transitionPolicy.getCurrentStep(app);
    const comment = this.trimComment(dto.comment);

    await this.apps.manager.transaction(async (em) => {
      await em.getRepository(ApplicationApproval).save(
        em.getRepository(ApplicationApproval).create({
          tenantId: app.tenantId,
          applicationId: app.id,
          approvalStepId: cur.id,
          actedByUserId: actorId,
          action: ApplicationApprovalAction.REJECTED,
          comment,
        }),
      );
      this.transitionPolicy.applyReject(app);
      await em.getRepository(Application).save(app);
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

    const template = await this.templates.findOne({
      where: {
        id: app.formDefinitionId,
        tenantId: app.tenantId,
        groupId: app.groupId,
      },
      relations: ['fields'],
    });
    if (!template) {
      throw clientError(ClientErrorCodes.FORM_DEFINITION_NOT_FOUND);
    }
    this.assertReturnFieldsBelongToTemplate(template, dto);

    const overall = this.trimComment(dto.overallComment);

    await this.apps.manager.transaction(async (em) => {
      const approvalRepo = em.getRepository(ApplicationApproval);
      const corrRepo = em.getRepository(CorrectionRequest);
      const itemRepo = em.getRepository(CorrectionRequestItem);
      const appRepo = em.getRepository(Application);

      await approvalRepo.save(
        approvalRepo.create({
          tenantId: app.tenantId,
          applicationId: app.id,
          approvalStepId: cur.id,
          actedByUserId: actorId,
          action: ApplicationApprovalAction.RETURNED,
          comment: overall,
        }),
      );

      const correction = await corrRepo.save(
        corrRepo.create({
          tenantId: app.tenantId,
          applicationId: app.id,
          requestedByUserId: actorId,
          status: CorrectionRequestStatus.OPEN,
          overallComment: overall,
          resolvedAt: null,
        }),
      );

      for (const row of dto.fields) {
        await itemRepo.save(
          itemRepo.create({
            tenantId: app.tenantId,
            correctionRequestId: correction.id,
            formFieldId: row.fieldId,
            comment: this.trimComment(row.comment),
            isResolved: false,
          }),
        );
      }

      this.transitionPolicy.applyReturn(app);
      await appRepo.save(app);
    });

    return template;
  }

  private async findOpenCorrection(
    applicationId: string,
  ): Promise<CorrectionRequest | null> {
    return this.correctionRequests.findOne({
      where: {
        applicationId,
        status: CorrectionRequestStatus.OPEN,
      },
      relations: ['items'],
    });
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
