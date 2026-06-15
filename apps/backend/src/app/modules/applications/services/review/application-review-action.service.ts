import { Injectable } from '@nestjs/common';
import { ApplicationApprovalAction } from '../../../../../models/constants/application-approval-action';
import { Application } from '../../../../../models/entities/application.entity';
import { FormDefinition } from '../../../../../models/entities/form-definition.entity';
import { ApplicationReviewRepository } from '../../../../../models/repositories/application-review.repository';
import type { TransactionManager } from '../../../../transaction';
import type {
  ApproveApplicationDto,
  RejectApplicationDto,
  ReturnApplicationDto,
} from '../../dto/applications.dto';
import { ApplicationTransitionPolicy } from '../../policies/application-transition.policy';
import { ApplicationReturnForCorrectionContextLoader } from './application-return-for-correction-context.loader';

/**
 * 承認・却下・差し戻しの状態遷移とレビュー履歴保存を扱う domain service。
 */
@Injectable()
export class ApplicationReviewActionService {
  constructor(
    private readonly returnContextLoader: ApplicationReturnForCorrectionContextLoader,
    private readonly reviewRepository: ApplicationReviewRepository,
    private readonly transitionPolicy: ApplicationTransitionPolicy,
  ) {}

  /**
   * 現在ステップを承認し、次ステップまたは承認済み状態へ遷移させる。
   * @param app 申請
   * @param actorId 操作者ユーザーID
   * @param dto 承認DTO
   * @param manager トランザクションマネージャー
   */
  async approve(
    app: Application,
    actorId: string,
    dto: ApproveApplicationDto,
    manager?: TransactionManager,
  ): Promise<void> {
    const cur = this.transitionPolicy.getCurrentStep(app);
    const next = this.transitionPolicy.getNextStep(app, cur);
    const comment = this.trimComment(dto.comment);

    this.transitionPolicy.applyApproval(app, next);
    await this.reviewRepository.saveApproval(
      {
        app,
        approvalStepId: cur.id,
        actorId,
        action: ApplicationApprovalAction.APPROVED,
        comment,
      },
      manager,
    );
  }

  /**
   * 現在ステップで却下履歴を保存し、申請を却下済みに遷移させる。
   * @param app 申請
   * @param actorId 操作者ユーザーID
   * @param dto 却下DTO
   * @param manager トランザクションマネージャー
   */
  async reject(
    app: Application,
    actorId: string,
    dto: RejectApplicationDto,
    manager?: TransactionManager,
  ): Promise<void> {
    const cur = this.transitionPolicy.getCurrentStep(app);
    const comment = this.trimComment(dto.comment);

    this.transitionPolicy.applyReject(app);
    await this.reviewRepository.saveApproval(
      {
        app,
        approvalStepId: cur.id,
        actorId,
        action: ApplicationApprovalAction.REJECTED,
        comment,
      },
      manager,
    );
  }

  /**
   * 現在ステップで差し戻し履歴と修正対象を保存し、申請を差し戻し済みに遷移させる。
   * @param app 申請
   * @param actorId 操作者ユーザーID
   * @param dto 差し戻しDTO
   * @param manager トランザクションマネージャー
   * @returns 差し戻しメールで使うフォーム定義
   */
  async returnForCorrection(
    app: Application,
    actorId: string,
    dto: ReturnApplicationDto,
    manager?: TransactionManager,
  ): Promise<FormDefinition> {
    const context = await this.returnContextLoader.load(app, dto, manager);
    const overall = this.trimComment(dto.overallComment);

    this.transitionPolicy.applyReturn(app);
    await this.reviewRepository.saveReturnForCorrection(
      {
        app,
        approvalStepId: context.currentStep.id,
        actorId,
        overallComment: overall,
        fields: dto.fields.map((field) => ({
          fieldId: field.fieldId,
          comment: this.trimComment(field.comment),
        })),
      },
      manager,
    );

    return context.template;
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
