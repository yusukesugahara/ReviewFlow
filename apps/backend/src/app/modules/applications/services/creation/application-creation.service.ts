import { Injectable } from '@nestjs/common';
import { ClientErrorCodes, clientError } from '../../../../../common/errors';
import { ApplicationStatus } from '../../../../../models/constants/application-status';
import { Application } from '../../../../../models/entities/application.entity';
import { ApplicationCreationRepository } from '../../../../../models/repositories/application-creation.repository';
import type { TransactionManager } from '../../../../transaction';
import type { CreateApplicationDto } from '../../dto/applications.dto';
import { ApplicationCreationContextLoader } from './application-creation-context.loader';
import { ApplicationInitialFieldValueBuilder } from './application-initial-field-value.builder';

/**
 * 申請レコードと初期フォーム値を作成する domain service。
 */
@Injectable()
export class ApplicationCreationService {
  constructor(
    private readonly creationRepository: ApplicationCreationRepository,
    private readonly contextLoader: ApplicationCreationContextLoader,
    private readonly initialFieldValueBuilder: ApplicationInitialFieldValueBuilder,
  ) {}

  /**
   * フォーム定義・承認フローを解決し、申請と初期フィールド値を保存する。
   * @param tenantId テナントID
   * @param applicantEmail 申請者メールアドレス
   * @param applicantUserId ログイン申請者のユーザーID
   * @param dto 申請作成DTO
   * @param manager トランザクションマネージャー
   * @returns 作成された申請
   */
  async create(
    tenantId: string,
    applicantEmail: string,
    applicantUserId: string | null,
    dto: CreateApplicationDto,
    manager?: TransactionManager,
  ): Promise<Application> {
    const { template, flow } = await this.contextLoader.load(tenantId, dto);
    const values = this.initialFieldValueBuilder.build(
      template,
      dto.values ?? {},
    );

    const newId = await this.creationRepository.createApplicationWithValues(
      {
        tenantId,
        groupId: dto.groupId,
        applicantUserId,
        applicantEmail,
        formDefinitionId: template.id,
        approvalFlowId: flow.id,
        status:
          dto.status === ApplicationStatus.PUBLISHED
            ? ApplicationStatus.PUBLISHED
            : ApplicationStatus.DRAFT,
        values,
      },
      manager,
    );

    return this.loadCreatedApplication(tenantId, newId, manager);
  }

  /**
   * 作成直後の申請を relation 込みで読み込む。
   * @param tenantId テナントID
   * @param id 申請ID
   * @param manager トランザクションマネージャー
   * @returns 作成された申請
   */
  private async loadCreatedApplication(
    tenantId: string,
    id: string,
    manager?: TransactionManager,
  ): Promise<Application> {
    const created = await this.creationRepository.findCreatedApplication(
      tenantId,
      id,
      manager,
    );
    if (!created) {
      throw clientError(ClientErrorCodes.APPLICATION_NOT_FOUND);
    }
    return created;
  }
}
