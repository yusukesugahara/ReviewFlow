import { Injectable } from '@nestjs/common';
import { Application } from '../../../../../models/entities/application.entity';
import { ApplicationSubmissionRepository } from '../../../../../models/repositories/application-submission.repository';
import type { TransactionManager } from '../../../../transaction';
import { ApplicationFormValueValidator } from '../../validators/application-form-value.validator';
import { ApplicationTransitionPolicy } from '../../policies/application-transition.policy';
import {
  ApplicationSubmissionContextLoader,
  type ResubmittableApplicationContext,
  type SubmittableApplicationContext,
} from './application-submission-context.loader';

@Injectable()
export class ApplicationSubmissionService {
  constructor(
    private readonly contextLoader: ApplicationSubmissionContextLoader,
    private readonly submissionRepository: ApplicationSubmissionRepository,
    private readonly formValueValidator: ApplicationFormValueValidator,
    private readonly transitionPolicy: ApplicationTransitionPolicy,
  ) {}

  async submit(
    tenantId: string,
    app: Application,
    manager?: TransactionManager,
  ): Promise<void> {
    const context = await this.contextLoader.loadSubmittable(tenantId, app);
    this.validateApplicationReadyToSubmit(context);
    await this.applySubmitTransition(context, manager);
  }

  async resubmit(
    tenantId: string,
    app: Application,
    manager?: TransactionManager,
  ): Promise<void> {
    const context = await this.contextLoader.loadResubmittable(tenantId, app);
    this.validateApplicationReadyToSubmit(context);
    await this.applyResubmitTransition(context, manager);
  }

  private validateApplicationReadyToSubmit(
    context: SubmittableApplicationContext,
  ): void {
    this.formValueValidator.assertApplicationValuesSubmittable(
      context.app,
      context.template.fields ?? [],
    );
  }

  private async saveSubmittedApplication(
    app: Application,
    manager?: TransactionManager,
  ): Promise<void> {
    await this.submissionRepository.saveSubmittedApplication(app, manager);
  }

  private async applySubmitTransition(
    context: SubmittableApplicationContext,
    manager?: TransactionManager,
  ): Promise<void> {
    this.transitionPolicy.startReview(context.app);
    await this.saveSubmittedApplication(context.app, manager);
  }

  private async applyResubmitTransition(
    context: ResubmittableApplicationContext,
    manager?: TransactionManager,
  ): Promise<void> {
    this.transitionPolicy.applyResubmit(context.app);
    await this.submissionRepository.saveResubmittedApplication(
      {
        app: context.app,
        openCorrection: context.openCorrection,
      },
      manager,
    );
  }
}
