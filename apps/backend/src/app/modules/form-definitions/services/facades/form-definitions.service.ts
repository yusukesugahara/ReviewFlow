import { Injectable } from '@nestjs/common';
import type { AuthUserPayload } from '../../../../../decorators/current-user.decorator';
import { FormField } from '../../../../../models/entities/form-field.entity';
import { FormDefinition } from '../../../../../models/entities/form-definition.entity';
import type { ApplicantAccessTokenPayload } from '../../../auth/services/facades/auth.service';
import type {
  CreateFormFieldDto,
  CreateFormDefinitionDto,
  RequestFormAccessDto,
  UpdateFormDefinitionDescriptionDto,
  UpdateFormFieldSettingsDto,
} from '../../dto/form-definitions.dto';
import {
  mapFormFieldToDto,
  mapFormDefinitionToDto,
} from '../../mappers/form-definitions.mapper';
import { FormAccessRequestService } from '../access-requests/form-access-request.service';
import { FormDefinitionCreationService } from '../creation/form-definition-creation.service';
import { FormDefinitionFieldsService } from '../fields/form-definition-fields.service';
import { FormDefinitionLifecycleService } from '../lifecycle/form-definition-lifecycle.service';
import { FormDefinitionQueryService } from '../query/form-definition-query.service';

/**
 * フォーム定義 API の facade。query / field edit / lifecycle / public access を委譲する。
 */
@Injectable()
export class FormDefinitionsService {
  constructor(
    private readonly formDefinitionCreation: FormDefinitionCreationService,
    private readonly formDefinitionQuery: FormDefinitionQueryService,
    private readonly formDefinitionFields: FormDefinitionFieldsService,
    private readonly formAccessRequests: FormAccessRequestService,
    private readonly formDefinitionLifecycle: FormDefinitionLifecycleService,
  ) {}

  /**
   * space 管理者向けにフォーム定義一覧を取得する。
   * @param actor ログインユーザー
   * @param groupId スペースID
   * @param includeArchived アーカイブ済みを含めるか
   * @returns フォーム定義一覧
   */
  async listByGroup(
    actor: AuthUserPayload,
    groupId: string,
    includeArchived = false,
  ): Promise<FormDefinition[]> {
    return this.formDefinitionQuery.listByGroup(
      actor,
      groupId,
      includeArchived,
    );
  }

  /**
   * space 内の代表フォーム定義を取得する。
   * @param actor ログインユーザー
   * @param groupId スペースID
   * @returns フォーム定義
   */
  async getOneByGroupForActor(
    actor: AuthUserPayload,
    groupId: string,
  ): Promise<FormDefinition> {
    return this.formDefinitionQuery.getOneByGroupForActor(actor, groupId);
  }

  /**
   * フォーム定義を作成する。
   * @param actor ログインユーザー
   * @param dto フォーム定義作成DTO
   * @returns 作成されたフォーム定義
   */
  async create(
    actor: AuthUserPayload,
    dto: CreateFormDefinitionDto,
  ): Promise<FormDefinition> {
    return this.formDefinitionCreation.create(actor, dto);
  }

  /**
   * 下書きフォーム定義へフィールドを追加する。
   * @param actor ログインユーザー
   * @param definitionId フォーム定義ID
   * @param dto フォームフィールド作成DTO
   * @returns 作成されたフォームフィールド
   */
  async addField(
    actor: AuthUserPayload,
    definitionId: string,
    dto: CreateFormFieldDto,
  ): Promise<FormField> {
    return this.formDefinitionFields.addField(actor, definitionId, dto);
  }

  /**
   * 下書きフォーム定義内のフィールド順序を移動する。
   * @param actor ログインユーザー
   * @param definitionId フォーム定義ID
   * @param fieldId フォームフィールドID
   * @param direction 移動方向
   */
  async moveField(
    actor: AuthUserPayload,
    definitionId: string,
    fieldId: string,
    direction: 'up' | 'down',
  ): Promise<void> {
    await this.formDefinitionFields.moveField(
      actor,
      definitionId,
      fieldId,
      direction,
    );
  }

  /**
   * 下書きフォーム定義からフィールドを削除する。
   * @param actor ログインユーザー
   * @param definitionId フォーム定義ID
   * @param fieldId フォームフィールドID
   */
  async deleteField(
    actor: AuthUserPayload,
    definitionId: string,
    fieldId: string,
  ): Promise<void> {
    await this.formDefinitionFields.deleteField(actor, definitionId, fieldId);
  }

  /**
   * 下書きフォームフィールドの設定を更新する。
   * @param actor ログインユーザー
   * @param definitionId フォーム定義ID
   * @param fieldId フォームフィールドID
   * @param dto フォームフィールド設定更新DTO
   */
  async updateFieldSettings(
    actor: AuthUserPayload,
    definitionId: string,
    fieldId: string,
    dto: UpdateFormFieldSettingsDto,
  ): Promise<void> {
    await this.formDefinitionFields.updateFieldSettings(
      actor,
      definitionId,
      fieldId,
      dto,
    );
  }

  /**
   * 下書きフォーム定義を公開する。
   * @param actor ログインユーザー
   * @param definitionId フォーム定義ID
   * @returns 公開されたフォーム定義
   */
  async publish(
    actor: AuthUserPayload,
    definitionId: string,
  ): Promise<FormDefinition> {
    return this.formDefinitionLifecycle.publish(actor, definitionId);
  }

  /**
   * フォーム定義をアーカイブする。
   * @param actor ログインユーザー
   * @param definitionId フォーム定義ID
   * @returns アーカイブされたフォーム定義
   */
  async archive(
    actor: AuthUserPayload,
    definitionId: string,
  ): Promise<FormDefinition> {
    return this.formDefinitionLifecycle.archive(actor, definitionId);
  }

  /**
   * アーカイブ済みフォーム定義を元の状態へ復元する。
   * @param actor ログインユーザー
   * @param definitionId フォーム定義ID
   * @returns 復元されたフォーム定義
   */
  async restore(
    actor: AuthUserPayload,
    definitionId: string,
  ): Promise<FormDefinition> {
    return this.formDefinitionLifecycle.restore(actor, definitionId);
  }

  /**
   * tenant scope 内のフォーム定義を取得する。
   * @param tenantId テナントID
   * @param definitionId フォーム定義ID
   * @returns フォーム定義
   */
  async getOne(
    tenantId: string,
    definitionId: string,
  ): Promise<FormDefinition> {
    return this.formDefinitionQuery.getOne(tenantId, definitionId);
  }

  /**
   * ログインユーザーが利用できるフォーム定義を取得する。
   * @param actor ログインユーザー
   * @param definitionId フォーム定義ID
   * @returns フォーム定義
   */
  async getOneForActor(
    actor: AuthUserPayload,
    definitionId: string,
  ): Promise<FormDefinition> {
    return this.formDefinitionQuery.getOneForActor(actor, definitionId);
  }

  /**
   * フォーム定義の説明文を更新する。
   * @param actor ログインユーザー
   * @param definitionId フォーム定義ID
   * @param dto 説明文更新DTO
   * @returns 更新されたフォーム定義
   */
  async updateDescription(
    actor: AuthUserPayload,
    definitionId: string,
    dto: UpdateFormDefinitionDescriptionDto,
  ): Promise<FormDefinition> {
    return this.formDefinitionLifecycle.updateDescription(
      actor,
      definitionId,
      dto,
    );
  }

  /**
   * 申請者トークンで公開フォーム定義を取得する。
   * @param actor 申請者トークン
   * @returns 公開フォーム定義
   */
  async getPublishedDefinitionForApplicant(
    actor: ApplicantAccessTokenPayload,
  ): Promise<FormDefinition> {
    return this.formAccessRequests.getPublishedDefinitionForApplicant(actor);
  }

  /**
   * 公開フォームへのアクセス要求を受け付ける。
   * @param groupId スペースID
   * @param dto アクセス要求DTO
   * @param formDefinitionId フォーム定義ID
   * @returns 受付結果
   */
  async requestAccess(
    groupId: string,
    dto: RequestFormAccessDto,
    formDefinitionId?: string,
  ) {
    return this.formAccessRequests.requestAccess(
      groupId,
      dto,
      formDefinitionId,
    );
  }

  /**
   * フォーム定義をレスポンスDTOへ変換する。
   * @param t フォーム定義
   * @returns フォーム定義DTO
   */
  toResponse(t: FormDefinition) {
    return mapFormDefinitionToDto(t);
  }

  /**
   * フォームフィールドをレスポンスDTOへ変換する。
   * @param f フォームフィールド
   * @returns フォームフィールドDTO
   */
  fieldToDto(f: FormField) {
    return mapFormFieldToDto(f);
  }
}
