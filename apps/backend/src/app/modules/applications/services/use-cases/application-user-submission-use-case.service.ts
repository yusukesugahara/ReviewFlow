import { Injectable } from '@nestjs/common';
import type { AuthUserPayload } from '../../../../../decorators/current-user.decorator';
import { ClientErrorCodes, clientError } from '../../../../../common/errors';
import { ApplicationStatus } from '../../../../../models/constants/application-status';
import type { Application } from '../../../../../models/entities/application.entity';
import { ApplicationQueryRepository } from '../../../../../models/repositories/application-query.repository';
import {
  BusinessAuditAction,
  BusinessAuditLogService,
} from '../../../audit-logs/services/business-audit-log.service';
import { SpaceAccessService } from '../../../groups/services/access/space-access.service';
import type { PatchApplicationDto } from '../../dto/applications.dto';
import { ApplicationApprovalFlowResolver } from '../../resolvers/application-approval-flow.resolver';
import { ApplicationFieldValuePatchService } from '../field-values/application-field-value-patch.service';
import { ApplicationQueryService } from '../query/application-query.service';
import { ApplicationSubmissionService } from '../submission/application-submission.service';
import {
  TransactionService,
  type TransactionManager,
} from '../../../../transaction';

/**
 * ログインユーザー本人の申請更新・提出・再提出を認可、監査ログ付きで実行する use case service。
 */
@Injectable()
export class ApplicationUserSubmissionUseCaseService {
  constructor(
    private readonly queryRepository: ApplicationQueryRepository,
    private readonly spaceAccess: SpaceAccessService,
    private readonly fieldValuePatchService: ApplicationFieldValuePatchService,
    private readonly flowResolver: ApplicationApprovalFlowResolver,
    private readonly queryService: ApplicationQueryService,
    private readonly submissionService: ApplicationSubmissionService,
    private readonly auditLogs: BusinessAuditLogService,
    private readonly transactions: TransactionService,
  ) {}

  /**
   * 申請者本人の編集可能な申請を更新する。
   * @param actor ログインユーザー
   * @param id 申請ID
   * @param dto 申請更新DTO
   * @returns 更新後に再取得した申請
   */
  async patch(
    actor: AuthUserPayload,
    id: string,
    dto: PatchApplicationDto,
  ): Promise<Application> {
    await this.transactions.run(async (manager) => {
      const app = await this.loadApplicantEditableApplication(
        actor,
        id,
        manager,
      );
      await this.spaceAccess.assertCanUseGroup(actor, app.groupId);
      if (dto.approvalFlowId) {
        await this.flowResolver.resolveActiveFlow(
          actor.tenantId,
          app.groupId,
          dto.approvalFlowId,
        );
      }
      const before = this.snapshot(app);
      await this.fieldValuePatchService.applyPatch(
        actor.tenantId,
        app,
        dto,
        manager,
      );
      if (before.status === ApplicationStatus.RETURNED) {
        await this.auditLogs.recordApplicationEvent(
          {
            actionType: BusinessAuditAction.APPLICATION_CORRECTED,
            actor: { id: actor.id ?? null, email: actor.email, type: 'user' },
            app,
            before,
            after: this.snapshot(app),
            metadataJson: { fieldKeys: Object.keys(dto.values ?? {}) },
          },
          manager,
        );
      }
    });
    return this.queryService.getOneForActor(actor, id);
  }

  /**
   * 申請者本人の下書き申請を提出する。
   * @param actor ログインユーザー
   * @param id 申請ID
   * @returns 提出後に再取得した申請
   */
  async submit(actor: AuthUserPayload, id: string): Promise<Application> {
    await this.transactions.run(async (manager) => {
      const app = await this.loadApplicantEditableApplication(
        actor,
        id,
        manager,
      );
      await this.spaceAccess.assertCanUseGroup(actor, app.groupId);
      const before = this.snapshot(app);
      await this.submissionService.submit(actor.tenantId, app, manager);
      await this.auditLogs.recordApplicationEvent(
        {
          actionType: BusinessAuditAction.APPLICATION_SUBMITTED,
          actor: { id: actor.id, email: actor.email, type: 'user' },
          app,
          before,
          after: this.snapshot(app),
        },
        manager,
      );
    });
    return this.queryService.getOneForActor(actor, id);
  }

  /**
   * 申請者本人の差し戻し済み申請を再提出する。
   * @param actor ログインユーザー
   * @param id 申請ID
   * @returns 再提出後に再取得した申請
   */
  async resubmit(actor: AuthUserPayload, id: string): Promise<Application> {
    await this.transactions.run(async (manager) => {
      const app = await this.loadApplicantEditableApplication(
        actor,
        id,
        manager,
      );
      await this.spaceAccess.assertCanUseGroup(actor, app.groupId);
      const before = this.snapshot(app);
      await this.submissionService.resubmit(actor.tenantId, app, manager);
      await this.auditLogs.recordApplicationEvent(
        {
          actionType: BusinessAuditAction.APPLICATION_RESUBMITTED,
          actor: { id: actor.id, email: actor.email, type: 'user' },
          app,
          before,
          after: this.snapshot(app),
        },
        manager,
      );
    });
    return this.queryService.getOneForActor(actor, id);
  }

  /**
   * 申請者本人が編集できる申請を transaction 用に読み込む。
   * @param actor ログインユーザー
   * @param id 申請ID
   * @param manager トランザクションマネージャー
   * @returns 編集可能な申請
   */
  private async loadApplicantEditableApplication(
    actor: { tenantId: string; id?: string; email: string },
    id: string,
    manager?: TransactionManager,
  ): Promise<Application> {
    const params = {
      id,
      tenantId: actor.tenantId,
      applicantUserId: actor.id,
      applicantEmail: actor.email,
    };
    const app = await this.queryRepository.findApplicantEditable(
      params,
      manager,
    );
    if (!app) {
      throw clientError(ClientErrorCodes.APPLICATION_NOT_FOUND);
    }
    return app;
  }

  /**
   * 監査ログ用に申請の状態と現在ステップを取得する。
   * @param app 申請
   * @returns 申請状態スナップショット
   */
  private snapshot(app: Application) {
    return {
      status: app.status,
      stepOrder: app.currentStepOrder,
    };
  }
}
