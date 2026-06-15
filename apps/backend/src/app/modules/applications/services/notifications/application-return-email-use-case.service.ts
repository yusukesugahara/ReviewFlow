import { Injectable } from '@nestjs/common';
import type { AuthUserPayload } from '../../../../../decorators/current-user.decorator';
import { ClientErrorCodes, clientError } from '../../../../../common/errors';
import type { Application } from '../../../../../models/entities/application.entity';
import { ApplicationQueryRepository } from '../../../../../models/repositories/application-query.repository';
import { SpaceAccessService } from '../../../groups/services/access/space-access.service';
import { ApplicationAccessPolicy } from '../../policies/application-access.policy';
import { ApplicationTransitionPolicy } from '../../policies/application-transition.policy';
import { ApplicationCorrectionService } from '../review/application-correction.service';
import { ApplicationNotificationService } from './application-notification.service';
import { ApplicationQueryService } from '../query/application-query.service';

/**
 * 差し戻しメール再送の認可・状態確認・通知送信を統括する use case service。
 */
@Injectable()
export class ApplicationReturnEmailUseCaseService {
  constructor(
    private readonly queryRepository: ApplicationQueryRepository,
    private readonly spaceAccess: SpaceAccessService,
    private readonly accessPolicy: ApplicationAccessPolicy,
    private readonly correctionService: ApplicationCorrectionService,
    private readonly notificationService: ApplicationNotificationService,
    private readonly queryService: ApplicationQueryService,
    private readonly transitionPolicy: ApplicationTransitionPolicy,
  ) {}

  /**
   * 閲覧可能かつ差し戻し済みの申請に対して差し戻しメールを再送する。
   * @param actor ログインユーザー
   * @param id 申請ID
   * @returns 再送後に再取得した申請
   */
  async resend(actor: AuthUserPayload, id: string): Promise<Application> {
    const app = await this.loadApplicationOrThrow(actor.tenantId, id);
    await this.spaceAccess.assertCanUseGroup(actor, app.groupId);
    await this.accessPolicy.assertCanRead(
      actor,
      app,
      (applicationId, actorId) =>
        this.countApprovalsByActor(applicationId, actorId),
    );
    this.transitionPolicy.assertReturned(app);

    const context = await this.correctionService.getReturnEmailContext(app);
    await this.notificationService.notifyApplicantOfReturn(
      app,
      context.template,
      context.dto,
    );

    return this.queryService.getOneForActor(actor, id);
  }

  /**
   * 過去承認者の閲覧判定に使う承認件数を取得する。
   * @param applicationId 申請ID
   * @param actorId 操作者ユーザーID
   * @returns 承認履歴件数
   */
  private countApprovalsByActor(
    applicationId: string,
    actorId: string,
  ): Promise<number> {
    return this.queryRepository.countApprovalsByActor(applicationId, actorId);
  }

  /**
   * tenant scope 内の申請を詳細付きで読み込む。
   * @param tenantId テナントID
   * @param id 申請ID
   * @returns 申請
   */
  private async loadApplicationOrThrow(
    tenantId: string,
    id: string,
  ): Promise<Application> {
    const row = await this.queryRepository.findById({
      tenantId,
      id,
      detail: true,
    });
    if (!row) {
      throw clientError(ClientErrorCodes.APPLICATION_NOT_FOUND);
    }
    return row;
  }
}
