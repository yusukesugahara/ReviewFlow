import { Injectable } from '@nestjs/common';
import type { AuthUserPayload } from '../../../../../decorators/current-user.decorator';
import { UserRole } from '../../../../../models/constants/user-role';
import type { Application } from '../../../../../models/entities/application.entity';
import {
  ApplicationQueryRepository,
  type ApplicationListPage,
  type ApplicationListPageOptions,
} from '../../../../../models/repositories/application-query.repository';
import { SpaceAccessService } from '../../../groups/services/access/space-access.service';
import type { CorrectionTargetsResponseDto } from '../../dto/applications.dto';
import { ApplicationAccessPolicy } from '../../policies/application-access.policy';
import { ApplicationCorrectionService } from '../review/application-correction.service';
import { ApplicationProgressService } from '../progress/application-progress.service';
import { ApplicationReadAccessService } from '../access/application-read-access.service';

/**
 * ログインユーザー向けの申請検索・詳細取得・修正情報取得を扱う query service。
 */
@Injectable()
export class ApplicationQueryService {
  constructor(
    private readonly queryRepository: ApplicationQueryRepository,
    private readonly spaceAccess: SpaceAccessService,
    private readonly accessPolicy: ApplicationAccessPolicy,
    private readonly correctionService: ApplicationCorrectionService,
    private readonly progressService: ApplicationProgressService,
    private readonly readAccess: ApplicationReadAccessService,
  ) {}

  /**
   * space 利用権限と申請閲覧条件に基づいて申請一覧を返す。
   * @param actor ログインユーザー
   * @param groupId スペースID
   * @returns 閲覧可能な申請一覧
   */
  async listForActor(
    actor: AuthUserPayload,
    groupId: string,
  ): Promise<Application[]> {
    await this.spaceAccess.assertCanUseGroup(actor, groupId);
    if (actor.roles.includes(UserRole.TENANT_ADMIN)) {
      const rows = await this.queryRepository.listForTenantAdmin(
        actor.tenantId,
        groupId,
      );
      return rows;
    }

    const rows = await this.queryRepository.listForGroup(
      actor.tenantId,
      groupId,
    );
    const canManageGroup = await this.spaceAccess.actorCanManageGroup(
      actor,
      groupId,
    );
    const visibleRows = rows.filter((app) =>
      this.accessPolicy.canListForActor(actor, app, canManageGroup),
    );
    return visibleRows;
  }

  /**
   * space 利用権限と申請閲覧条件に基づいて、申請一覧をDBページ単位で返す。
   * @param actor ログインユーザー
   * @param groupId スペースID
   * @param page offset pagination
   * @returns 閲覧可能な申請ページ
   */
  async listConnectionForActor(
    actor: AuthUserPayload,
    groupId: string,
    page: ApplicationListPageOptions,
  ): Promise<ApplicationListPage> {
    await this.spaceAccess.assertCanUseGroup(actor, groupId);
    if (actor.roles.includes(UserRole.TENANT_ADMIN)) {
      return this.queryRepository.listForTenantAdminPage(
        actor.tenantId,
        groupId,
        page,
      );
    }

    return this.queryRepository.listVisibleForActorPage(
      {
        actorId: actor.id,
        canManageGroup: await this.spaceAccess.actorCanManageGroup(
          actor,
          groupId,
        ),
        groupId,
        tenantId: actor.tenantId,
      },
      page,
    );
  }

  /**
   * ログインユーザーが閲覧できる申請詳細を承認進捗付きで返す。
   * @param actor ログインユーザー
   * @param id 申請ID
   * @returns 承認進捗付き申請
   */
  async getOneForActor(
    actor: AuthUserPayload,
    id: string,
  ): Promise<Application> {
    const row = await this.readAccess.loadReadable(actor, id, {
      detail: true,
      allowManagingSetup: true,
    });
    return this.progressService.hydrate(row);
  }

  /**
   * ログインユーザーが閲覧できる申請の修正履歴を返す。
   * @param actor ログインユーザー
   * @param id 申請ID
   * @returns 修正履歴レスポンス
   */
  async getCorrectionsForActor(actor: AuthUserPayload, id: string) {
    const app = await this.readAccess.loadReadable(actor, id, {
      detail: false,
    });

    return this.correctionService.listCorrections(actor.tenantId, app);
  }

  /**
   * ログインユーザーが閲覧できる申請の差し戻し修正対象を返す。
   * @param actor ログインユーザー
   * @param applicationId 申請ID
   * @returns 修正対象レスポンス
   */
  async getCorrectionTargetsForActor(
    actor: AuthUserPayload,
    applicationId: string,
  ): Promise<CorrectionTargetsResponseDto> {
    const app = await this.readAccess.loadReadable(actor, applicationId, {
      detail: true,
    });

    return this.correctionService.buildTargetsResponse(app);
  }
}
