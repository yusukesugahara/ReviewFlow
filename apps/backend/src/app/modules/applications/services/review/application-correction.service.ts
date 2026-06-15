import { Injectable } from '@nestjs/common';
import { ClientErrorCodes, clientError } from '../../../../../common/errors';
import type { Application } from '../../../../../models/entities/application.entity';
import { CorrectionRequest } from '../../../../../models/entities/correction-request.entity';
import { FormDefinition } from '../../../../../models/entities/form-definition.entity';
import { ApplicationCorrectionRepository } from '../../../../../models/repositories/application-correction.repository';
import { FormDefinitionsRepository } from '../../../../../models/repositories/form-definitions.repository';
import type {
  CorrectionTargetsResponseDto,
  ReturnApplicationEmailDto,
} from '../../dto/applications.dto';
import {
  mapCorrectionTargetsResponse,
  mapCorrectionToReturnApplicationDto,
  mapCorrectionsList,
} from '../../mappers/applications.mapper';

/**
 * 差し戻し修正リクエストの参照・表示用レスポンス組み立てを扱う service。
 */
@Injectable()
export class ApplicationCorrectionService {
  constructor(
    private readonly formDefinitionsRepository: FormDefinitionsRepository,
    private readonly correctionRepository: ApplicationCorrectionRepository,
  ) {}

  /**
   * 申請に紐づく修正履歴を一覧DTOとして返す。
   * @param tenantId テナントID
   * @param app 申請
   * @returns 修正履歴レスポンス
   */
  async listCorrections(tenantId: string, app: Application) {
    const rows = await this.correctionRepository.listCorrections(
      tenantId,
      app.id,
    );
    return mapCorrectionsList(rows);
  }

  /**
   * open な修正リクエストから修正対象レスポンスを組み立てる。
   * @param app 申請
   * @returns 修正対象レスポンス
   */
  async buildTargetsResponse(
    app: Application,
  ): Promise<CorrectionTargetsResponseDto> {
    const open = await this.findOpenCorrectionWithItems(app.tenantId, app.id);
    return mapCorrectionTargetsResponse(app, open);
  }

  /**
   * 差し戻しメール送信に必要なフォーム定義とメールDTOを取得する。
   * @param app 申請
   * @returns 差し戻しメール用コンテキスト
   */
  async getReturnEmailContext(
    app: Application,
  ): Promise<{ template: FormDefinition; dto: ReturnApplicationEmailDto }> {
    const openCorrection = await this.findOpenCorrection(app);
    if (!openCorrection) {
      throw clientError(ClientErrorCodes.APPLICATION_NO_OPEN_CORRECTION);
    }

    const template =
      await this.formDefinitionsRepository.findTemplateByIdInGroup({
        tenantId: app.tenantId,
        groupId: app.groupId,
        formDefinitionId: app.formDefinitionId,
      });
    if (!template) {
      throw clientError(ClientErrorCodes.FORM_DEFINITION_NOT_FOUND);
    }

    return {
      template,
      dto: mapCorrectionToReturnApplicationDto(openCorrection),
    };
  }

  /**
   * 申請に紐づく open な修正リクエストを取得する。
   * @param app 申請
   * @returns open な修正リクエスト
   */
  private async findOpenCorrection(
    app: Application,
  ): Promise<CorrectionRequest | null> {
    return this.correctionRepository.findOpenCorrection({
      tenantId: app.tenantId,
      applicationId: app.id,
    });
  }

  /**
   * 修正項目込みで最新の open な修正リクエストを取得する。
   * @param tenantId テナントID
   * @param applicationId 申請ID
   * @returns open な修正リクエスト
   */
  private async findOpenCorrectionWithItems(
    tenantId: string,
    applicationId: string,
  ): Promise<CorrectionRequest | null> {
    return this.correctionRepository.findLatestOpenCorrectionWithItems(
      tenantId,
      applicationId,
    );
  }
}
