import { Injectable } from '@nestjs/common';
import type { ApplicantAccessTokenPayload } from '../../../auth/services/facades/auth.service';
import { ClientErrorCodes, clientError } from '../../../../../common/errors';
import type { Application } from '../../../../../models/entities/application.entity';
import { ApplicationQueryRepository } from '../../../../../models/repositories/application-query.repository';
import type { TransactionManager } from '../../../../transaction';

type ApplicantSession = ApplicantAccessTokenPayload;

/**
 * 申請者アクセストークンを使用して申請を操作するためのサービス。
 */
@Injectable()
export class ApplicantApplicationAccessService {
  constructor(private readonly queryRepository: ApplicationQueryRepository) {}

  /**
   * 申請者トークンの group scope で公開申請を作成できるか検証する。
   * @param actor 申請者
   * @param groupId グループID
   */
  assertCanCreateInGroup(actor: ApplicantSession, groupId: string): void {
    if (groupId !== actor.groupId) {
      throw clientError(ClientErrorCodes.APPLICATION_ACCESS_DENIED);
    }
  }

  /**
   * 申請者が提出した申請を読み込む。
   * @param tenantId テナントID
   * @param id 申請ID
   * @param options オプション
   * @returns 申請
   */
  async loadSubmittedApplication(
    tenantId: string,
    id: string,
    options: { detail: boolean },
  ): Promise<Application> {
    const row = await this.queryRepository.findById({
      tenantId,
      id,
      detail: options.detail,
    });
    if (!row) {
      throw clientError(ClientErrorCodes.APPLICATION_NOT_FOUND);
    }
    return row;
  }

  /**
   * manager が渡された場合、repository 側で対象 application 行を悲観ロックする。
   * 申請者の修正・再提出などの更新系 use case では transaction manager を渡す。
   * @param actor 申請者
   * @param id 申請ID
   * @param manager トランザクションマネージャー
   * @returns 申請
   */
  async loadEditableApplication(
    actor: ApplicantSession,
    id: string,
    manager?: TransactionManager,
  ): Promise<Application> {
    this.assertCanAccessApplication(actor, id);
    const params = {
      id,
      tenantId: actor.tenantId,
      applicantUserId: undefined,
      applicantEmail: actor.email,
    };
    const app = await this.queryRepository.findApplicantEditable(
      params,
      manager,
    );
    if (!app) {
      throw clientError(ClientErrorCodes.APPLICATION_NOT_FOUND);
    }
    this.assertApplicantGroupMatches(actor, app);
    return app;
  }

  /**
   * 申請者が提出した申請を読み込む。
   * @param actor 申請者
   * @param id 申請ID
   * @returns 申請
   */
  async loadApplicationDetail(
    actor: ApplicantSession,
    id: string,
  ): Promise<Application> {
    this.assertCanAccessApplication(actor, id);
    const app = await this.queryRepository.findById({
      id,
      tenantId: actor.tenantId,
      detail: true,
    });
    if (!app) {
      throw clientError(ClientErrorCodes.APPLICATION_NOT_FOUND);
    }
    this.assertApplicantGroupMatches(actor, app);
    this.assertApplicantEmailMatches(actor, app);
    return app;
  }

  /**
   * トークンに紐づく申請IDを取得する。
   * @param actor 申請者
   * @returns トークンに紐づく申請ID
   */
  getTokenApplicationIdOrThrow(actor: ApplicantSession): string {
    if (!actor.applicationId) {
      throw clientError(ClientErrorCodes.APPLICATION_NOT_FOUND);
    }
    return actor.applicationId;
  }

  /**
   * トークンが特定申請に紐づく場合、その申請だけにアクセスを制限する。
   * @param actor 申請者
   * @param id 申請ID
   */
  private assertCanAccessApplication(
    actor: ApplicantSession,
    id: string,
  ): void {
    if (actor.applicationId && actor.applicationId !== id) {
      throw clientError(ClientErrorCodes.APPLICATION_ACCESS_DENIED);
    }
  }

  /**
   * 申請者トークンの group scope と申請の group が一致するか検証する。
   * @param actor 申請者
   * @param app 申請
   */
  private assertApplicantGroupMatches(
    actor: ApplicantSession,
    app: Application,
  ): void {
    if (app.groupId !== actor.groupId) {
      throw clientError(ClientErrorCodes.APPLICATION_ACCESS_DENIED);
    }
  }

  /**
   * 申請者トークンのメールアドレスと申請者メールが一致するか検証する。
   * @param actor 申請者
   * @param app 申請
   */
  private assertApplicantEmailMatches(
    actor: ApplicantSession,
    app: Application,
  ): void {
    if (app.applicantEmail.toLowerCase() !== actor.email.toLowerCase()) {
      throw clientError(ClientErrorCodes.APPLICATION_ACCESS_DENIED);
    }
  }
}
