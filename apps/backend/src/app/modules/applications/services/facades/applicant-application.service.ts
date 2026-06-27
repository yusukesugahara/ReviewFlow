import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { ApplicantAccessTokenPayload } from '../../../auth/services/facades/auth.service';
import { ClientErrorCodes, clientError } from '../../../../../common/errors';
import { ApplicationStatus } from '../../../../../models/constants/application-status';
import type { Application } from '../../../../../models/entities/application.entity';
import {
  BusinessAuditAction,
  BusinessAuditLogService,
} from '../../../audit-logs/services/business-audit-log.service';
import type {
  CorrectionTargetsResponseDto,
  CreatePublicApplicationDto,
  PatchApplicationDto,
  ResubmitApplicationDto,
} from '../../dto/applications.dto';
import { ApplicationApprovalFlowResolver } from '../../resolvers/application-approval-flow.resolver';
import { ApplicantApplicationAccessService } from '../access/applicant-application-access.service';
import { ApplicationCorrectionService } from '../review/application-correction.service';
import { ApplicationCreationService } from '../creation/application-creation.service';
import { ApplicationFieldValuePatchService } from '../field-values/application-field-value-patch.service';
import { ApplicationNotificationService } from '../notifications/application-notification.service';
import { ApplicationProgressService } from '../progress/application-progress.service';
import { ApplicationSubmissionService } from '../submission/application-submission.service';

type ApplicantSession = ApplicantAccessTokenPayload;

/**
 * 申請者トークンで実行される公開申請・差し戻し修正・再提出を統括する facade。
 */
@Injectable()
export class ApplicantApplicationService {
  constructor(
    private readonly applicantAccess: ApplicantApplicationAccessService,
    private readonly correctionService: ApplicationCorrectionService,
    private readonly creationService: ApplicationCreationService,
    private readonly fieldValuePatchService: ApplicationFieldValuePatchService,
    private readonly flowResolver: ApplicationApprovalFlowResolver,
    private readonly notificationService: ApplicationNotificationService,
    private readonly progressService: ApplicationProgressService,
    private readonly submissionService: ApplicationSubmissionService,
    private readonly auditLogs: BusinessAuditLogService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 申請者トークンの scope で公開申請を作成し、そのまま提出する。
   * @param actor 申請者トークン
   * @param dto 公開申請作成DTO
   * @returns 提出済み申請
   */
  async createAndSubmit(
    actor: ApplicantSession,
    dto: CreatePublicApplicationDto,
  ): Promise<Application> {
    this.applicantAccess.assertCanCreateInGroup(actor, dto.groupId);
    const flow = await this.flowResolver.resolveDefaultActiveFlow(
      actor.tenantId,
      actor.groupId,
    );
    const created = await this.dataSource.transaction(async (manager) => {
      const row = await this.creationService.create(
        actor.tenantId,
        actor.email,
        null,
        {
          ...dto,
          formDefinitionId: actor.formDefinitionId ?? dto.formDefinitionId,
          approvalFlowId: flow.id,
          status: ApplicationStatus.DRAFT,
        },
        manager,
      );
      await this.auditLogs.recordApplicationEvent(
        {
          actionType: BusinessAuditAction.APPLICATION_CREATED,
          actor: { id: null, email: actor.email, type: 'applicant' },
          app: row,
          after: {
            status: row.status,
            stepOrder: row.currentStepOrder,
          },
        },
        manager,
      );
      const before = this.snapshot(row);
      await this.submissionService.submit(actor.tenantId, row, manager);
      await this.auditLogs.recordApplicationEvent(
        {
          actionType: BusinessAuditAction.APPLICATION_SUBMITTED,
          actor: { id: null, email: actor.email, type: 'applicant' },
          app: row,
          before,
          after: this.snapshot(row),
        },
        manager,
      );
      return row;
    });
    const submitted = await this.applicantAccess.loadSubmittedApplication(
      actor.tenantId,
      created.id,
      {
        detail: true,
      },
    );
    const hydrated = await this.progressService.hydrate(submitted);
    await this.notificationService.notifyApplicantOfSubmission(hydrated);
    return hydrated;
  }

  /**
   * 申請者トークンに紐づく申請詳細を返す。
   * @param actor 申請者トークン
   * @returns 申請詳細
   */
  async getCurrentApplication(actor: ApplicantSession): Promise<Application> {
    const applicationId =
      this.applicantAccess.getTokenApplicationIdOrThrow(actor);
    const app = await this.applicantAccess.loadApplicationDetail(
      actor,
      applicationId,
    );
    return this.progressService.hydrate(app);
  }

  /**
   * 申請者トークンに紐づく差し戻し申請の修正対象を返す。
   * @param actor 申請者トークン
   * @returns 修正対象レスポンス
   */
  async getReturnedCorrection(
    actor: ApplicantSession,
  ): Promise<CorrectionTargetsResponseDto> {
    const applicationId =
      this.applicantAccess.getTokenApplicationIdOrThrow(actor);
    const app = await this.applicantAccess.loadEditableApplication(
      actor,
      applicationId,
    );
    return this.correctionService.buildTargetsResponse(app);
  }

  /**
   * 申請者が差し戻し対象フィールドを修正する。
   * @param actor 申請者トークン
   * @param id 申請ID
   * @param dto 申請更新DTO
   * @returns 修正後の申請
   */
  async patchReturned(
    actor: ApplicantSession,
    id: string,
    dto: PatchApplicationDto,
  ): Promise<Application> {
    if (dto.formDefinitionId || dto.approvalFlowId) {
      throw clientError(ClientErrorCodes.APPLICATION_NOT_EDITABLE);
    }
    await this.dataSource.transaction(async (manager) => {
      const app = await this.applicantAccess.loadEditableApplication(
        actor,
        id,
        manager,
      );
      const before = this.snapshot(app);
      await this.fieldValuePatchService.applyPatch(
        actor.tenantId,
        app,
        dto,
        manager,
      );
      await this.auditLogs.recordApplicationEvent(
        {
          actionType: BusinessAuditAction.APPLICATION_CORRECTED,
          actor: { id: null, email: actor.email, type: 'applicant' },
          app,
          before,
          after: this.snapshot(app),
          metadataJson: { fieldKeys: Object.keys(dto.values ?? {}) },
        },
        manager,
      );
    });
    const updated = await this.applicantAccess.loadApplicationDetail(actor, id);
    return this.progressService.hydrate(updated);
  }

  /**
   * 申請者が差し戻し済み申請を再提出する。
   * @param actor 申請者トークン
   * @param id 申請ID
   * @returns 再提出後の申請
   */
  async resubmit(
    actor: ApplicantSession,
    id: string,
    dto: ResubmitApplicationDto = {},
  ): Promise<Application> {
    await this.dataSource.transaction(async (manager) => {
      const app = await this.applicantAccess.loadEditableApplication(
        actor,
        id,
        manager,
      );
      const before = this.snapshot(app);
      await this.submissionService.resubmit(actor.tenantId, app, manager);
      await this.auditLogs.recordApplicationEvent(
        {
          actionType: BusinessAuditAction.APPLICATION_RESUBMITTED,
          actor: { id: null, email: actor.email, type: 'applicant' },
          app,
          before,
          after: this.snapshot(app),
          metadataJson: { message: this.trimMessage(dto.message) },
        },
        manager,
      );
    });
    const updated = await this.applicantAccess.loadApplicationDetail(actor, id);
    return this.progressService.hydrate(updated);
  }

  private trimMessage(message: string | undefined): string | null {
    const trimmed = message?.trim();
    return trimmed ? trimmed : null;
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
