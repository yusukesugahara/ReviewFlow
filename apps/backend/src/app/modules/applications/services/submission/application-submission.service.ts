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

/**
 * 申請の提出・再提出の入力値検証、状態遷移、保存を扱う domain service。
 */
@Injectable()
export class ApplicationSubmissionService {
  constructor(
    private readonly contextLoader: ApplicationSubmissionContextLoader,
    private readonly submissionRepository: ApplicationSubmissionRepository,
    private readonly formValueValidator: ApplicationFormValueValidator,
    private readonly transitionPolicy: ApplicationTransitionPolicy,
  ) {}

  /**
   * 下書き申請を提出し、審査中へ遷移させる。
   * @param tenantId テナントID
   * @param app 申請
   * @param manager トランザクションマネージャー
   */
  async submit(
    tenantId: string,
    app: Application,
    manager?: TransactionManager,
  ): Promise<void> {
    const context = await this.contextLoader.loadSubmittable(tenantId, app);
    this.validateApplicationReadyToSubmit(context);
    await this.applySubmitTransition(context, manager);
  }

  /**
   * 差し戻し済み申請を再提出し、open 修正リクエストを解決する。
   * @param tenantId テナントID
   * @param app 申請
   * @param manager トランザクションマネージャー
   */
  async resubmit(
    tenantId: string,
    app: Application,
    manager?: TransactionManager,
  ): Promise<void> {
    const context = await this.contextLoader.loadResubmittable(
      tenantId,
      app,
      manager,
    );
    this.validateApplicationReadyToSubmit(context);
    await this.applyResubmitTransition(context, manager);
  }

  /**
   * 必須項目など、提出可能な入力値が揃っているか検証する。
   * @param context 提出用コンテキスト
   */
  private validateApplicationReadyToSubmit(
    context: SubmittableApplicationContext,
  ): void {
    this.formValueValidator.assertApplicationValuesSubmittable(
      context.app,
      context.template.fields ?? [],
    );
  }

  /**
   * 提出済み申請を保存する。
   * @param app 申請
   * @param manager トランザクションマネージャー
   */
  private async saveSubmittedApplication(
    app: Application,
    manager?: TransactionManager,
  ): Promise<void> {
    await this.submissionRepository.saveSubmittedApplication(app, manager);
  }

  /**
   * 下書き申請を審査中へ進めて保存する。
   * @param context 提出用コンテキスト
   * @param manager トランザクションマネージャー
   */
  private async applySubmitTransition(
    context: SubmittableApplicationContext,
    manager?: TransactionManager,
  ): Promise<void> {
    this.transitionPolicy.startReview(context.app);
    await this.saveSubmittedApplication(context.app, manager);
  }

  /**
   * 差し戻し済み申請を再提出し、修正リクエストを解決済みにして保存する。
   * @param context 再提出用コンテキスト
   * @param manager トランザクションマネージャー
   */
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
