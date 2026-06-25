import { Injectable } from '@nestjs/common';
import type { AuthUserPayload } from '../../../../../decorators/current-user.decorator';
import type { ApplicantAccessTokenPayload } from '../../../auth/services/facades/auth.service';
import { Application } from '../../../../../models/entities/application.entity';
import type {
  ApplicationListPage,
  ApplicationListPageOptions,
} from '../../../../../models/repositories/application-query.repository';
import type {
  ApplicationDetailDto,
  ApproveApplicationDto,
  CorrectionTargetsResponseDto,
  CreateApplicationDto,
  CreatePublicApplicationDto,
  PatchApplicationDto,
  RejectApplicationDto,
  ReturnApplicationDto,
  ResubmitApplicationDto,
} from '../../dto/applications.dto';
import {
  mapApplicationToDetail,
  mapApplicationToSummary,
} from '../../mappers/applications.mapper';
import { ApplicantApplicationService } from './applicant-application.service';
import { ApplicationActionCapabilitiesService } from '../access/application-action-capabilities.service';
import { ApplicationCreationUseCaseService } from '../use-cases/application-creation-use-case.service';
import { ApplicationQueryService } from '../query/application-query.service';
import { ApplicationReviewUseCaseService } from '../use-cases/application-review-use-case.service';
import { ApplicationReturnEmailUseCaseService } from '../notifications/application-return-email-use-case.service';
import { ApplicationUserSubmissionUseCaseService } from '../use-cases/application-user-submission-use-case.service';

type ApplicantSession = ApplicantAccessTokenPayload;

/**
 * 申請 API の facade。Controller からの呼び出しを use case / query service へ委譲する。
 */
@Injectable()
export class ApplicationsService {
  constructor(
    private readonly actionCapabilities: ApplicationActionCapabilitiesService,
    private readonly applicantApplicationService: ApplicantApplicationService,
    private readonly creationUseCaseService: ApplicationCreationUseCaseService,
    private readonly queryService: ApplicationQueryService,
    private readonly reviewUseCaseService: ApplicationReviewUseCaseService,
    private readonly returnEmailUseCaseService: ApplicationReturnEmailUseCaseService,
    private readonly userSubmissionUseCaseService: ApplicationUserSubmissionUseCaseService,
  ) {}

  /**
   * ログインユーザーが閲覧できる申請一覧を取得する。
   * @param actor ログインユーザー
   * @param groupId スペースID
   * @returns 申請一覧
   */
  async listForActor(
    actor: AuthUserPayload,
    groupId: string,
  ): Promise<Application[]> {
    return this.queryService.listForActor(actor, groupId);
  }

  /**
   * ログインユーザーが閲覧できる申請一覧をページ単位で取得する。
   * @param actor ログインユーザー
   * @param groupId スペースID
   * @param page offset pagination
   * @returns 申請ページ
   */
  async listConnectionForActor(
    actor: AuthUserPayload,
    groupId: string,
    page: ApplicationListPageOptions,
  ): Promise<ApplicationListPage> {
    return this.queryService.listConnectionForActor(actor, groupId, page);
  }

  /**
   * ログインユーザーが閲覧できる申請詳細を取得する。
   * @param actor ログインユーザー
   * @param id 申請ID
   * @returns 申請詳細
   */
  async getOneForActor(
    actor: AuthUserPayload,
    id: string,
  ): Promise<Application> {
    return this.queryService.getOneForActor(actor, id);
  }

  /**
   * ログインユーザーの申請を作成する。
   * @param actor ログインユーザー
   * @param dto 申請作成DTO
   * @returns 作成された申請
   */
  async create(
    actor: AuthUserPayload,
    dto: CreateApplicationDto,
  ): Promise<Application> {
    return this.creationUseCaseService.create(actor, dto);
  }

  /**
   * 公開申請フォームから申請を作成して提出する。
   * @param actor 申請者トークン
   * @param dto 公開申請作成DTO
   * @returns 提出済み申請
   */
  async createAndSubmitForApplicant(
    actor: ApplicantSession,
    dto: CreatePublicApplicationDto,
  ): Promise<Application> {
    return this.applicantApplicationService.createAndSubmit(actor, dto);
  }

  /**
   * ログインユーザーが自分の申請を更新する。
   * @param actor ログインユーザー
   * @param id 申請ID
   * @param dto 申請更新DTO
   * @returns 更新後の申請
   */
  async patch(
    actor: AuthUserPayload,
    id: string,
    dto: PatchApplicationDto,
  ): Promise<Application> {
    return this.userSubmissionUseCaseService.patch(actor, id, dto);
  }

  /**
   * ログインユーザーが自分の申請を提出する。
   * @param actor ログインユーザー
   * @param id 申請ID
   * @returns 提出後の申請
   */
  async submit(actor: AuthUserPayload, id: string): Promise<Application> {
    return this.userSubmissionUseCaseService.submit(actor, id);
  }

  /**
   * 承認者が申請を承認する。
   * @param actor ログインユーザー
   * @param id 申請ID
   * @param dto 承認DTO
   * @returns 承認後の申請
   */
  async approve(
    actor: AuthUserPayload,
    id: string,
    dto: ApproveApplicationDto,
  ): Promise<Application> {
    return this.reviewUseCaseService.approve(actor, id, dto);
  }

  /**
   * 承認者が申請を却下する。
   * @param actor ログインユーザー
   * @param id 申請ID
   * @param dto 却下DTO
   * @returns 却下後の申請
   */
  async reject(
    actor: AuthUserPayload,
    id: string,
    dto: RejectApplicationDto,
  ): Promise<Application> {
    return this.reviewUseCaseService.reject(actor, id, dto);
  }

  /**
   * 承認者が申請を修正依頼として差し戻す。
   * @param actor ログインユーザー
   * @param id 申請ID
   * @param dto 差し戻しDTO
   * @returns 差し戻し後の申請
   */
  async returnApplication(
    actor: AuthUserPayload,
    id: string,
    dto: ReturnApplicationDto,
  ): Promise<Application> {
    return this.reviewUseCaseService.returnApplication(actor, id, dto);
  }

  /**
   * 差し戻しメールを再送する。
   * @param actor ログインユーザー
   * @param id 申請ID
   * @returns 再送後に再取得した申請
   */
  async resendReturnEmail(
    actor: AuthUserPayload,
    id: string,
  ): Promise<Application> {
    return this.returnEmailUseCaseService.resend(actor, id);
  }

  /**
   * ログインユーザーが差し戻し済み申請を再提出する。
   * @param actor ログインユーザー
   * @param id 申請ID
   * @returns 再提出後の申請
   */
  async resubmit(
    actor: AuthUserPayload,
    id: string,
    dto: ResubmitApplicationDto = {},
  ): Promise<Application> {
    return this.userSubmissionUseCaseService.resubmit(actor, id, dto);
  }

  /**
   * 申請者トークンに紐づく差し戻し修正対象を取得する。
   * @param actor 申請者トークン
   * @returns 修正対象レスポンス
   */
  async getReturnedCorrectionForApplicant(
    actor: ApplicantSession,
  ): Promise<CorrectionTargetsResponseDto> {
    return this.applicantApplicationService.getReturnedCorrection(actor);
  }

  /**
   * 申請者トークンで差し戻し対象フィールドを修正する。
   * @param actor 申請者トークン
   * @param id 申請ID
   * @param dto 申請更新DTO
   * @returns 修正後の申請
   */
  async patchReturnedForApplicant(
    actor: ApplicantSession,
    id: string,
    dto: PatchApplicationDto,
  ): Promise<Application> {
    return this.applicantApplicationService.patchReturned(actor, id, dto);
  }

  /**
   * 申請者トークンで差し戻し済み申請を再提出する。
   * @param actor 申請者トークン
   * @param id 申請ID
   * @returns 再提出後の申請
   */
  async resubmitForApplicant(
    actor: ApplicantSession,
    id: string,
    dto: ResubmitApplicationDto = {},
  ): Promise<Application> {
    return this.applicantApplicationService.resubmit(actor, id, dto);
  }

  /**
   * ログインユーザーが閲覧できる修正履歴を取得する。
   * @param actor ログインユーザー
   * @param id 申請ID
   * @returns 修正履歴
   */
  async getCorrectionsForActor(actor: AuthUserPayload, id: string) {
    return this.queryService.getCorrectionsForActor(actor, id);
  }

  /**
   * ログインユーザーが閲覧できる差し戻し修正対象を取得する。
   * @param actor ログインユーザー
   * @param applicationId 申請ID
   * @returns 修正対象レスポンス
   */
  async getCorrectionTargetsForActor(
    actor: AuthUserPayload,
    applicationId: string,
  ): Promise<CorrectionTargetsResponseDto> {
    return this.queryService.getCorrectionTargetsForActor(actor, applicationId);
  }

  /**
   * 申請を概要DTOへ変換する。
   * @param row 申請
   * @returns 申請概要DTO
   */
  toSummary(row: Application) {
    return mapApplicationToSummary(row);
  }

  /**
   * 申請を詳細DTOへ変換する。
   * @param row 申請
   * @returns 申請詳細DTO
   */
  toDetail(row: Application) {
    return mapApplicationToDetail(row);
  }

  /**
   * ログインユーザー向け操作可能フラグ付きの申請詳細DTOへ変換する。
   * @param row 申請
   * @param actor ログインユーザー
   * @returns 申請詳細DTO
   */
  async toDetailForActor(
    row: Application,
    actor: AuthUserPayload,
  ): Promise<ApplicationDetailDto> {
    return mapApplicationToDetail(
      row,
      await this.actionCapabilities.buildForUser(actor, row),
    );
  }

  /**
   * 申請者トークン向け操作可能フラグ付きの申請詳細DTOへ変換する。
   * @param row 申請
   * @param actor 申請者トークン
   * @returns 申請詳細DTO
   */
  toDetailForApplicant(
    row: Application,
    actor: ApplicantSession,
  ): ApplicationDetailDto {
    return mapApplicationToDetail(
      row,
      this.actionCapabilities.buildForApplicant(actor, row),
    );
  }
}
