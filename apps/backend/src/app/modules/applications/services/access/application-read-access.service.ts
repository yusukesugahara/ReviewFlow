import { Injectable } from '@nestjs/common';
import type { AuthUserPayload } from '../../../../../decorators/current-user.decorator';
import { ClientErrorCodes, clientError } from '../../../../../common/errors';
import type { Application } from '../../../../../models/entities/application.entity';
import { ApplicationQueryRepository } from '../../../../../models/repositories/application-query.repository';
import { SpaceAccessService } from '../../../groups/services/access/space-access.service';
import { ApplicationAccessPolicy } from '../../policies/application-access.policy';

type LoadReadableApplicationOptions = {
  detail: boolean;
  allowManagingSetup?: boolean;
};

/**
 * ログインユーザーが読み取れる申請を tenant / space / 申請権限で読み込むサービス。
 */
@Injectable()
export class ApplicationReadAccessService {
  constructor(
    private readonly queryRepository: ApplicationQueryRepository,
    private readonly spaceAccess: SpaceAccessService,
    private readonly accessPolicy: ApplicationAccessPolicy,
  ) {}

  /**
   * 申請を読み込み、space 利用権限と申請閲覧権限を検証する。
   * @param actor ログインユーザー
   * @param id 申請ID
   * @param options 読み込みオプション
   * @returns 閲覧可能な申請
   */
  async loadReadable(
    actor: AuthUserPayload,
    id: string,
    options: LoadReadableApplicationOptions,
  ): Promise<Application> {
    const app = await this.loadApplicationOrThrow(
      actor.tenantId,
      id,
      options.detail,
    );
    await this.spaceAccess.assertCanUseGroup(actor, app.groupId);

    if (
      options.allowManagingSetup &&
      this.accessPolicy.isSetupApplication(app)
    ) {
      const canManageGroup = await this.spaceAccess.actorCanManageGroup(
        actor,
        app.groupId,
      );
      if (
        this.accessPolicy.canReadSetupApplicationAsManager(app, canManageGroup)
      ) {
        return app;
      }
    }

    await this.accessPolicy.assertCanRead(
      actor,
      app,
      (applicationId, actorId) =>
        this.queryRepository.countApprovalsByActor(applicationId, actorId),
    );
    return app;
  }

  /**
   * tenant scope 内の申請を読み込み、存在しなければ not found にする。
   * @param tenantId テナントID
   * @param id 申請ID
   * @param detail 詳細 relation を読み込むか
   * @returns 申請
   */
  private async loadApplicationOrThrow(
    tenantId: string,
    id: string,
    detail: boolean,
  ): Promise<Application> {
    const app = await this.queryRepository.findById({
      tenantId,
      id,
      detail,
    });
    if (!app) {
      throw clientError(ClientErrorCodes.APPLICATION_NOT_FOUND);
    }
    return app;
  }
}
