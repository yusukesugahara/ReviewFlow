import { Injectable } from '@nestjs/common';
import { ApplicationFieldValue } from '../../../../../models/entities/application-field-value.entity';
import { Application } from '../../../../../models/entities/application.entity';
import { ApplicationSubmissionRepository } from '../../../../../models/repositories/application-submission.repository';
import type { TransactionManager } from '../../../../transaction';
import type { PatchApplicationDto } from '../../dto/applications.dto';
import { ApplicationFieldValuePatchBuilder } from './application-field-value-patch.builder';
import { ApplicationPatchContextLoader } from './application-patch-context.loader';

/**
 * 申請のフォーム定義・承認フロー・状態・フィールド値更新を適用する service。
 */
@Injectable()
export class ApplicationFieldValuePatchService {
  constructor(
    private readonly submissionRepository: ApplicationSubmissionRepository,
    private readonly patchContextLoader: ApplicationPatchContextLoader,
    private readonly fieldValuePatchBuilder: ApplicationFieldValuePatchBuilder,
  ) {}

  /**
   * 申請更新DTOを検証し、保存対象のフィールド値差分を永続化する。
   * @param tenantId テナントID
   * @param app 申請
   * @param dto 申請更新DTO
   * @param manager トランザクションマネージャー
   */
  async applyPatch(
    tenantId: string,
    app: Application,
    dto: PatchApplicationDto,
    manager?: TransactionManager,
  ): Promise<void> {
    const context = await this.patchContextLoader.load(
      tenantId,
      app,
      dto,
      manager,
    );
    const existingValues =
      await this.submissionRepository.findExistingFieldValues(
        {
          tenantId: app.tenantId,
          applicationId: app.id,
        },
        manager,
      );
    const fieldValues = this.fieldValuePatchBuilder.build(
      context,
      dto.values ?? {},
      existingValues,
    );
    await this.saveApplicationPatch(app, dto, fieldValues, manager);
  }

  /**
   * 実際に変更がある場合だけ申請更新を保存する。
   * @param app 申請
   * @param dto 申請更新DTO
   * @param values 保存対象のフィールド値
   * @param manager トランザクションマネージャー
   */
  private async saveApplicationPatch(
    app: Application,
    dto: PatchApplicationDto,
    values: ApplicationFieldValue[],
    manager?: TransactionManager,
  ): Promise<void> {
    if (
      !dto.formDefinitionId &&
      !dto.approvalFlowId &&
      !dto.status &&
      values.length === 0
    ) {
      return;
    }
    await this.submissionRepository.saveApplicationPatch(
      {
        app,
        formDefinitionId: dto.formDefinitionId,
        approvalFlowId: dto.approvalFlowId,
        status: dto.status,
        values,
      },
      manager,
    );
  }
}
