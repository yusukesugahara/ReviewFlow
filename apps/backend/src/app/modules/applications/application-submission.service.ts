import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { ClientErrorCodes, clientError } from '../../../common/errors';
import { CorrectionRequestStatus } from '../../../models/constants/correction-request-status';
import { Application } from '../../../models/entities/application.entity';
import { CorrectionRequestItem } from '../../../models/entities/correction-request-item.entity';
import { CorrectionRequest } from '../../../models/entities/correction-request.entity';
import { FormDefinition } from '../../../models/entities/form-definition.entity';
import { ApplicationFormValueValidator } from './application-form-value.validator';
import { ApplicationTransitionPolicy } from './application-transition.policy';

type SubmittableApplicationContext = {
  app: Application;
  template: FormDefinition;
};

type ResubmittableApplicationContext = SubmittableApplicationContext & {
  openCorrection: CorrectionRequest;
};

@Injectable()
export class ApplicationSubmissionService {
  constructor(
    @InjectRepository(Application)
    private readonly apps: Repository<Application>,
    @InjectRepository(CorrectionRequest)
    private readonly correctionRequests: Repository<CorrectionRequest>,
    @InjectRepository(FormDefinition)
    private readonly templates: Repository<FormDefinition>,
    private readonly formValueValidator: ApplicationFormValueValidator,
    private readonly transitionPolicy: ApplicationTransitionPolicy,
  ) {}

  async submit(tenantId: string, app: Application): Promise<void> {
    const context = await this.loadSubmittableApplicationContext(tenantId, app);
    this.validateApplicationReadyToSubmit(context);
    await this.applySubmitTransition(context);
  }

  async resubmit(tenantId: string, app: Application): Promise<void> {
    const context = await this.loadResubmittableApplicationContext(
      tenantId,
      app,
    );
    this.validateApplicationReadyToSubmit(context);
    await this.applyResubmitTransition(context);
  }

  private async loadSubmittableApplicationContext(
    tenantId: string,
    app: Application,
  ): Promise<SubmittableApplicationContext> {
    this.transitionPolicy.assertDraft(app);

    const template = await this.templates.findOne({
      where: { id: app.formDefinitionId, tenantId, groupId: app.groupId },
      relations: ['fields'],
    });
    if (!template) {
      throw clientError(ClientErrorCodes.FORM_DEFINITION_NOT_FOUND);
    }

    return { app, template };
  }

  private validateApplicationReadyToSubmit(
    context: SubmittableApplicationContext,
  ): void {
    this.formValueValidator.assertApplicationValuesSubmittable(
      context.app,
      context.template.fields ?? [],
    );
  }

  private async saveSubmittedApplication(app: Application): Promise<void> {
    await this.apps.manager.transaction(async (em: EntityManager) => {
      await em.getRepository(Application).save(app);
    });
  }

  private async applySubmitTransition(
    context: SubmittableApplicationContext,
  ): Promise<void> {
    this.transitionPolicy.startReview(context.app);
    await this.saveSubmittedApplication(context.app);
  }

  private async loadResubmittableApplicationContext(
    tenantId: string,
    app: Application,
  ): Promise<ResubmittableApplicationContext> {
    this.transitionPolicy.assertReturned(app);

    const openCorrection = await this.correctionRequests.findOne({
      where: {
        applicationId: app.id,
        status: CorrectionRequestStatus.OPEN,
      },
      relations: ['items'],
    });
    if (!openCorrection) {
      throw clientError(ClientErrorCodes.APPLICATION_NO_OPEN_CORRECTION);
    }

    const template = await this.templates.findOne({
      where: { id: app.formDefinitionId, tenantId, groupId: app.groupId },
      relations: ['fields'],
    });
    if (!template) {
      throw clientError(ClientErrorCodes.FORM_DEFINITION_NOT_FOUND);
    }

    return { app, template, openCorrection };
  }

  private async applyResubmitTransition(
    context: ResubmittableApplicationContext,
  ): Promise<void> {
    await this.apps.manager.transaction(async (em: EntityManager) => {
      const corrRepo = em.getRepository(CorrectionRequest);
      const itemRepo = em.getRepository(CorrectionRequestItem);
      const appRepo = em.getRepository(Application);

      context.openCorrection.status = CorrectionRequestStatus.RESOLVED;
      context.openCorrection.resolvedAt = new Date();
      await corrRepo.save(context.openCorrection);

      for (const it of context.openCorrection.items ?? []) {
        it.isResolved = true;
        await itemRepo.save(it);
      }

      this.transitionPolicy.applyResubmit(context.app);
      await appRepo.save(context.app);
    });
  }
}
