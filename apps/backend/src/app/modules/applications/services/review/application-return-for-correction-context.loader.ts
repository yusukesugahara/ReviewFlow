import { Injectable } from '@nestjs/common';
import { ClientErrorCodes, clientError } from '../../../../../common/errors';
import type { Application } from '../../../../../models/entities/application.entity';
import type { ApprovalStep } from '../../../../../models/entities/approval-step.entity';
import type { FormDefinition } from '../../../../../models/entities/form-definition.entity';
import { ApplicationCorrectionRepository } from '../../../../../models/repositories/application-correction.repository';
import { FormDefinitionsRepository } from '../../../../../models/repositories/form-definitions.repository';
import type { TransactionManager } from '../../../../transaction';
import type { ReturnApplicationDto } from '../../dto/applications.dto';
import { ApplicationTransitionPolicy } from '../../policies/application-transition.policy';

export type ReturnForCorrectionContext = {
  currentStep: ApprovalStep;
  template: FormDefinition;
};

/**
 * 差し戻し実行前に必要な承認ステップ・修正リクエスト・フォーム定義を検証する loader。
 */
@Injectable()
export class ApplicationReturnForCorrectionContextLoader {
  constructor(
    private readonly formDefinitionsRepository: FormDefinitionsRepository,
    private readonly correctionRepository: ApplicationCorrectionRepository,
    private readonly transitionPolicy: ApplicationTransitionPolicy,
  ) {}

  /**
   * 差し戻し可能な現在ステップとフォーム定義を読み込み、差し戻し対象項目を検証する。
   * @param app 申請
   * @param dto 差し戻しDTO
   * @param manager トランザクションマネージャー
   * @returns 差し戻しコンテキスト
   */
  async load(
    app: Application,
    dto: ReturnApplicationDto,
    manager?: TransactionManager,
  ): Promise<ReturnForCorrectionContext> {
    const currentStep = this.transitionPolicy.getCurrentStep(app);
    this.transitionPolicy.assertStepCanReturn(currentStep);
    await this.assertNoOpenCorrection(app, manager);

    const template = await this.loadTemplate(app);
    this.assertReturnFieldsBelongToTemplate(template, dto);

    return { currentStep, template };
  }

  /**
   * 既に open な修正リクエストがないことを検証する。
   * @param app 申請
   * @param manager トランザクションマネージャー
   */
  private async assertNoOpenCorrection(
    app: Application,
    manager?: TransactionManager,
  ): Promise<void> {
    const existingOpen = await this.correctionRepository.findOpenCorrection(
      { tenantId: app.tenantId, applicationId: app.id },
      manager,
    );
    if (existingOpen) {
      throw clientError(ClientErrorCodes.APPLICATION_CORRECTION_ALREADY_OPEN);
    }
  }

  /**
   * 申請に紐づくフォーム定義を読み込む。
   * @param app 申請
   * @returns フォーム定義
   */
  private async loadTemplate(app: Application): Promise<FormDefinition> {
    const template =
      await this.formDefinitionsRepository.findTemplateByIdInGroup({
        tenantId: app.tenantId,
        groupId: app.groupId,
        formDefinitionId: app.formDefinitionId,
      });
    if (!template) {
      throw clientError(ClientErrorCodes.FORM_DEFINITION_NOT_FOUND);
    }

    return template;
  }

  /**
   * 差し戻し対象フィールドが申請フォーム定義に含まれているか検証する。
   * @param template フォーム定義
   * @param dto 差し戻しDTO
   */
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
}
