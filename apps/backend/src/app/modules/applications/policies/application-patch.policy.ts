import { Injectable } from '@nestjs/common';
import { ClientErrorCodes, clientError } from '../../../../common/errors';
import { ApplicationStatus } from '../../../../models/constants/application-status';
import type { Application } from '../../../../models/entities/application.entity';
import type { PatchApplicationDto } from '../dto/applications.dto';

/**
 * 申請更新時にどの項目を変更できるかを判定する policy。
 *
 * 差し戻し中は修正対象 field だけ、下書き・公開済みは metadata 変更も許可する。
 */
@Injectable()
export class ApplicationPatchPolicy {
  /**
   * 申請本体の patch が現在 status で許可されるか検証する。
   *
   * 差し戻し修正では form / flow / status などの metadata 変更を禁止する。
   */
  assertPatchTargetEditable(app: Application, dto: PatchApplicationDto): void {
    if (this.requiresCorrectionFieldScope(app) && this.changesMetadata(dto)) {
      throw clientError(ClientErrorCodes.APPLICATION_NOT_EDITABLE);
    }

    if (dto.status && !this.isDraftOrPublished(app)) {
      throw clientError(ClientErrorCodes.APPLICATION_NOT_EDITABLE);
    }
  }

  /**
   * 公開済みフォーム定義の変更が許可されるか検証する。
   * @param app 申請
   * @param formDefinitionId 公開済みフォーム定義ID
   */
  assertFormDefinitionChangeAllowed(
    app: Application,
    formDefinitionId?: string,
  ): void {
    if (formDefinitionId && !this.isDraftOrPublished(app)) {
      throw clientError(ClientErrorCodes.APPLICATION_NOT_EDITABLE);
    }
  }

  /**
   * 差し戻し修正時に field 単位の修正対象制限が必要かを返す。
   * @param app 申請
   * @returns 差し戻し修正時に field 単位の修正対象制限が必要か
   */
  assertFieldPatchAllowedWithoutCorrectionScope(app: Application): void {
    if (!this.isDraftOrPublished(app)) {
      throw clientError(ClientErrorCodes.APPLICATION_NOT_EDITABLE);
    }
  }

  /**
   * 差し戻し修正時に field 単位の修正対象制限が必要かを返す。
   * @param app 申請
   * @returns 差し戻し修正時に field 単位の修正対象制限が必要か
   */
  requiresCorrectionFieldScope(app: Application): boolean {
    return app.status === ApplicationStatus.RETURNED;
  }

  /**
   * メタデータの変更があるかを返す。
   * @param dto 申請更新DTO
   * @returns メタデータの変更があるか
   */
  private changesMetadata(dto: PatchApplicationDto): boolean {
    return !!(dto.formDefinitionId || dto.approvalFlowId || dto.status);
  }

  /**
   * 下書きまたは公開済みの申請かを返す。
   * @param app 申請
   * @returns 下書きまたは公開済みの申請か
   */
  private isDraftOrPublished(app: Application): boolean {
    return (
      app.status === ApplicationStatus.DRAFT ||
      app.status === ApplicationStatus.PUBLISHED
    );
  }
}
