import { Injectable } from '@nestjs/common';
import { ClientErrorCodes, clientError } from '../../../../common/errors';
import { Application } from '../../../../models/entities/application.entity';
import { CorrectionRequest } from '../../../../models/entities/correction-request.entity';
import { FormDefinition } from '../../../../models/entities/form-definition.entity';
import { ApplicationsRepository } from '../../../../models/repositories/applications.repository';
import { ApplicationFormValueValidator } from '../validators/application-form-value.validator';
import { ApplicationTransitionPolicy } from '../policies/application-transition.policy';

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
    private readonly applicationsRepository: ApplicationsRepository,
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

    const template = await this.applicationsRepository.findTemplateByIdInGroup({
      tenantId,
      groupId: app.groupId,
      formDefinitionId: app.formDefinitionId,
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
    await this.applicationsRepository.saveSubmittedApplication(app);
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

    const openCorrection = await this.applicationsRepository.findOpenCorrection(
      app.id,
    );
    if (!openCorrection) {
      throw clientError(ClientErrorCodes.APPLICATION_NO_OPEN_CORRECTION);
    }

    const template = await this.applicationsRepository.findTemplateByIdInGroup({
      tenantId,
      groupId: app.groupId,
      formDefinitionId: app.formDefinitionId,
    });
    if (!template) {
      throw clientError(ClientErrorCodes.FORM_DEFINITION_NOT_FOUND);
    }

    return { app, template, openCorrection };
  }

  private async applyResubmitTransition(
    context: ResubmittableApplicationContext,
  ): Promise<void> {
    this.transitionPolicy.applyResubmit(context.app);
    await this.applicationsRepository.saveResubmittedApplication({
      app: context.app,
      openCorrection: context.openCorrection,
    });
  }
}
