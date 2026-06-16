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
import type {
  ApproveApplicationDto,
  RejectApplicationDto,
  ReturnApplicationDto,
} from '../../dto/applications.dto';
import { ApplicationAccessPolicy } from '../../policies/application-access.policy';
import { ApplicationNotificationService } from '../notifications/application-notification.service';
import { ApplicationQueryService } from '../query/application-query.service';
import { ApplicationReviewActionService } from '../review/application-review-action.service';
import {
  TransactionService,
  type TransactionManager,
} from '../../../../transaction';

/**
 * 承認者の承認・却下・差し戻しを認可、状態競合検出、監査ログ付きで実行する use case service。
 */
@Injectable()
export class ApplicationReviewUseCaseService {
  constructor(
    private readonly queryRepository: ApplicationQueryRepository,
    private readonly spaceAccess: SpaceAccessService,
    private readonly accessPolicy: ApplicationAccessPolicy,
    private readonly notificationService: ApplicationNotificationService,
    private readonly queryService: ApplicationQueryService,
    private readonly reviewActionService: ApplicationReviewActionService,
    private readonly auditLogs: BusinessAuditLogService,
    private readonly transactions: TransactionService,
  ) {}

  /**
   * 期待承認ステップを検証し、申請を承認する。
   * @param actor ログインユーザー
   * @param id 申請ID
   * @param dto 承認DTO
   * @returns 承認後に再取得した申請
   */
  async approve(
    actor: AuthUserPayload,
    id: string,
    dto: ApproveApplicationDto,
  ): Promise<Application> {
    await this.transactions.run(async (manager) => {
      const app = await this.loadReviewableApplicationForExpectedStep(
        actor,
        id,
        dto.expectedStepOrder,
        manager,
      );
      const before = this.snapshot(app);
      await this.reviewActionService.approve(app, actor.id, dto, manager);
      await this.auditLogs.recordApplicationEvent(
        {
          actionType: BusinessAuditAction.APPLICATION_APPROVED,
          actor: { id: actor.id, email: actor.email, type: 'user' },
          app,
          before,
          after: this.snapshot(app),
          metadataJson: { comment: this.trimComment(dto.comment) },
        },
        manager,
      );
    });
    return this.queryService.getOneForActor(actor, id);
  }

  /**
   * 期待承認ステップを検証し、申請を却下する。
   * @param actor ログインユーザー
   * @param id 申請ID
   * @param dto 却下DTO
   * @returns 却下後に再取得した申請
   */
  async reject(
    actor: AuthUserPayload,
    id: string,
    dto: RejectApplicationDto,
  ): Promise<Application> {
    await this.transactions.run(async (manager) => {
      const app = await this.loadReviewableApplicationForExpectedStep(
        actor,
        id,
        dto.expectedStepOrder,
        manager,
      );
      const before = this.snapshot(app);
      await this.reviewActionService.reject(app, actor.id, dto, manager);
      await this.auditLogs.recordApplicationEvent(
        {
          actionType: BusinessAuditAction.APPLICATION_REJECTED,
          actor: { id: actor.id, email: actor.email, type: 'user' },
          app,
          before,
          after: this.snapshot(app),
          metadataJson: { comment: this.trimComment(dto.comment) },
        },
        manager,
      );
    });
    return this.queryService.getOneForActor(actor, id);
  }

  /**
   * 期待承認ステップを検証し、申請を差し戻して申請者へ通知する。
   * @param actor ログインユーザー
   * @param id 申請ID
   * @param dto 差し戻しDTO
   * @returns 差し戻し後に再取得した申請
   */
  async returnApplication(
    actor: AuthUserPayload,
    id: string,
    dto: ReturnApplicationDto,
  ): Promise<Application> {
    const { app, template } = await this.transactions.run(async (manager) => {
      const app = await this.loadReviewableApplicationForExpectedStep(
        actor,
        id,
        dto.expectedStepOrder,
        manager,
      );
      const before = this.snapshot(app);
      const result = await this.reviewActionService.returnForCorrection(
        app,
        actor.id,
        dto,
        manager,
      );
      await this.auditLogs.recordApplicationEvent(
        {
          actionType: BusinessAuditAction.APPLICATION_RETURNED,
          actor: { id: actor.id, email: actor.email, type: 'user' },
          app,
          before,
          after: this.snapshot(app),
          metadataJson: {
            overallComment: this.trimComment(dto.overallComment),
            fieldIds: dto.fields.map((field) => field.fieldId),
          },
        },
        manager,
      );
      return { app, template: result };
    });
    await this.notificationService.notifyApplicantOfReturn(app, template, dto);
    return this.queryService.getOneForActor(actor, id);
  }

  /**
   * 審査操作対象の申請を pessimistic lock 付きで読み込み、space access と承認権限を検証する。
   * @param actor ログインユーザー
   * @param id 申請ID
   * @param expectedStepOrder 期待する承認ステップ
   * @param manager トランザクションマネージャー
   * @returns 審査操作可能な申請
   */
  private async loadReviewableApplicationForExpectedStep(
    actor: AuthUserPayload,
    id: string,
    expectedStepOrder: number,
    manager?: TransactionManager,
  ): Promise<Application> {
    const app = await this.loadApplicationOrThrow(actor.tenantId, id, manager);
    await this.spaceAccess.assertCanUseGroup(actor, app.groupId);
    const canManageGroup = await this.spaceAccess.actorCanManageGroup(
      actor,
      app.groupId,
    );
    if (!canManageGroup && !this.accessPolicy.canActOnReview(actor, app)) {
      throw clientError(ClientErrorCodes.APPLICATION_APPROVAL_FORBIDDEN);
    }
    this.assertExpectedReviewStep(app, expectedStepOrder);
    return app;
  }

  /**
   * tenant scope 内の申請を詳細付きで読み込む。
   * @param tenantId テナントID
   * @param id 申請ID
   * @param manager トランザクションマネージャー
   * @returns 申請
   */
  private async loadApplicationOrThrow(
    tenantId: string,
    id: string,
    manager?: TransactionManager,
  ): Promise<Application> {
    const row = await this.queryRepository.findByIdInTenant(
      { tenantId, id, detail: true },
      manager,
    );
    if (!row) {
      throw clientError(ClientErrorCodes.APPLICATION_NOT_FOUND);
    }
    return row;
  }

  /**
   * 申請が審査中で、クライアントが期待した承認ステップのままか検証する。
   * @param app 申請
   * @param expectedStepOrder 期待する承認ステップ
   */
  private assertExpectedReviewStep(
    app: Application,
    expectedStepOrder: number,
  ): void {
    if (
      app.status !== ApplicationStatus.IN_REVIEW ||
      app.currentStepOrder !== expectedStepOrder
    ) {
      throw clientError(ClientErrorCodes.APPLICATION_REVIEW_STATE_CONFLICT);
    }
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

  /**
   * 空白だけのコメントを null に正規化する。
   * @param value コメント
   * @returns 正規化したコメント
   */
  private trimComment(value: string | undefined): string | null {
    return value?.trim().length ? value.trim() : null;
  }
}
