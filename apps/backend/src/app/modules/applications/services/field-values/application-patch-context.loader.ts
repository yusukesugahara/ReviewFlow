import { Injectable } from '@nestjs/common';
import { ClientErrorCodes, clientError } from '../../../../../common/errors';
import type { Application } from '../../../../../models/entities/application.entity';
import { CorrectionRequest } from '../../../../../models/entities/correction-request.entity';
import type { FormField } from '../../../../../models/entities/form-field.entity';
import { ApplicationCorrectionRepository } from '../../../../../models/repositories/application-correction.repository';
import { FormDefinitionsRepository } from '../../../../../models/repositories/form-definitions.repository';
import type { TransactionManager } from '../../../../transaction';
import type { PatchApplicationDto } from '../../dto/applications.dto';
import { ApplicationPatchPolicy } from '../../policies/application-patch.policy';
import { ApplicationFormValueValidator } from '../../validators/application-form-value.validator';

export type ApplicationPatchContext = {
  app: Application;
  fieldsByKey: Map<string, FormField>;
};

/**
 * 申請更新に必要なフォーム定義・フィールド一覧・差し戻し対象 scope を読み込む loader。
 */
@Injectable()
export class ApplicationPatchContextLoader {
  constructor(
    private readonly formDefinitionsRepository: FormDefinitionsRepository,
    private readonly correctionRepository: ApplicationCorrectionRepository,
    private readonly patchPolicy: ApplicationPatchPolicy,
    private readonly formValueValidator: ApplicationFormValueValidator,
  ) {}

  /**
   * 申請更新DTOの前提を検証し、更新対象フィールドのコンテキストを組み立てる。
   * @param tenantId テナントID
   * @param app 申請
   * @param dto 申請更新DTO
   * @param manager トランザクションマネージャー
   * @returns 申請更新コンテキスト
   */
  async load(
    tenantId: string,
    app: Application,
    dto: PatchApplicationDto,
    manager?: TransactionManager,
  ): Promise<ApplicationPatchContext> {
    this.patchPolicy.assertPatchTargetEditable(app, dto);
    this.patchPolicy.assertFormDefinitionChangeAllowed(
      app,
      dto.formDefinitionId,
    );

    const template =
      await this.formDefinitionsRepository.findTemplateByIdInGroup({
        tenantId,
        groupId: app.groupId,
        formDefinitionId: dto.formDefinitionId ?? app.formDefinitionId,
        onlyPublished: !!dto.formDefinitionId,
      });
    if (!template) {
      throw clientError(ClientErrorCodes.FORM_DEFINITION_NOT_FOUND);
    }

    const fieldsByKey = this.formValueValidator.buildFieldsByKey(
      template.fields ?? [],
    );
    await this.assertFieldPatchAllowed(app, manager);

    return { app, fieldsByKey };
  }

  /**
   * 差し戻し済み申請では open correction の存在を検証し、それ以外では通常編集可否を検証する。
   * @param app 申請
   * @param manager トランザクションマネージャー
   */
  private async assertFieldPatchAllowed(
    app: Application,
    manager?: TransactionManager,
  ): Promise<void> {
    if (!this.patchPolicy.requiresOpenCorrection(app)) {
      this.patchPolicy.assertFieldPatchAllowedWithoutCorrectionScope(app);
      return;
    }

    const open = await this.findOpenCorrection(app, manager);
    if (!open?.items?.length) {
      throw clientError(ClientErrorCodes.APPLICATION_NOT_EDITABLE);
    }
  }

  /**
   * 申請に紐づく open な修正リクエストを取得する。
   * @param app 申請
   * @param manager トランザクションマネージャー
   * @returns open な修正リクエスト
   */
  private async findOpenCorrection(
    app: Application,
    manager?: TransactionManager,
  ): Promise<CorrectionRequest | null> {
    return this.correctionRepository.findOpenCorrection(
      { tenantId: app.tenantId, applicationId: app.id },
      manager,
    );
  }
}
