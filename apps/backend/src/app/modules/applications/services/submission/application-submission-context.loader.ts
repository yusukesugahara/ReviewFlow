import { Injectable } from '@nestjs/common';
import { ClientErrorCodes, clientError } from '../../../../../common/errors';
import type { Application } from '../../../../../models/entities/application.entity';
import type { CorrectionRequest } from '../../../../../models/entities/correction-request.entity';
import type { FormDefinition } from '../../../../../models/entities/form-definition.entity';
import { ApplicationCorrectionRepository } from '../../../../../models/repositories/application-correction.repository';
import { FormDefinitionsRepository } from '../../../../../models/repositories/form-definitions.repository';
import type { TransactionManager } from '../../../../transaction';
import { ApplicationTransitionPolicy } from '../../policies/application-transition.policy';

export type SubmittableApplicationContext = {
  app: Application;
  template: FormDefinition;
};

export type ResubmittableApplicationContext = SubmittableApplicationContext & {
  openCorrection: CorrectionRequest;
};

/**
 * 提出・再提出に必要な申請状態、フォーム定義、open 修正リクエストを読み込む loader。
 */
@Injectable()
export class ApplicationSubmissionContextLoader {
  constructor(
    private readonly formDefinitionsRepository: FormDefinitionsRepository,
    private readonly correctionRepository: ApplicationCorrectionRepository,
    private readonly transitionPolicy: ApplicationTransitionPolicy,
  ) {}

  /**
   * 下書き申請の提出に必要なフォーム定義を読み込む。
   * @param tenantId テナントID
   * @param app 申請
   * @returns 提出用コンテキスト
   */
  async loadSubmittable(
    tenantId: string,
    app: Application,
  ): Promise<SubmittableApplicationContext> {
    this.transitionPolicy.assertDraft(app);
    const template = await this.loadTemplate(tenantId, app);

    return { app, template };
  }

  /**
   * 差し戻し済み申請の再提出に必要なフォーム定義と open 修正リクエストを読み込む。
   * @param tenantId テナントID
   * @param app 申請
   * @param manager トランザクションマネージャー
   * @returns 再提出用コンテキスト
   */
  async loadResubmittable(
    tenantId: string,
    app: Application,
    manager?: TransactionManager,
  ): Promise<ResubmittableApplicationContext> {
    this.transitionPolicy.assertReturned(app);

    const openCorrection = await this.correctionRepository.findOpenCorrection(
      { tenantId, applicationId: app.id },
      manager,
    );
    if (!openCorrection) {
      throw clientError(ClientErrorCodes.APPLICATION_NO_OPEN_CORRECTION);
    }

    const template = await this.loadTemplate(tenantId, app);

    return { app, template, openCorrection };
  }

  /**
   * 申請に紐づくフォーム定義を読み込む。
   * @param tenantId テナントID
   * @param app 申請
   * @returns フォーム定義
   */
  private async loadTemplate(
    tenantId: string,
    app: Application,
  ): Promise<FormDefinition> {
    const template =
      await this.formDefinitionsRepository.findTemplateByIdInGroup({
        tenantId,
        groupId: app.groupId,
        formDefinitionId: app.formDefinitionId,
      });
    if (!template) {
      throw clientError(ClientErrorCodes.FORM_DEFINITION_NOT_FOUND);
    }

    return template;
  }
}
