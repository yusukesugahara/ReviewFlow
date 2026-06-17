import { Injectable } from '@nestjs/common';
import { ClientErrorCodes, clientError } from '../../../../../common/errors';
import type { AuthUserPayload } from '../../../../../decorators/current-user.decorator';
import { FormDefinitionStatus } from '../../../../../models/constants/form-definition-status';
import { FormField } from '../../../../../models/entities/form-field.entity';
import { FormDefinition } from '../../../../../models/entities/form-definition.entity';
import { FormDefinitionsRepository } from '../../../../../models/repositories/form-definitions.repository';
import { FormFieldsRepository } from '../../../../../models/repositories/form-fields.repository';
import { SpaceAccessService } from '../../../groups/services/access/space-access.service';
import type {
  CreateFormFieldDto,
  UpdateFormFieldSettingsDto,
} from '../../dto/form-definitions.dto';

/**
 * 下書きフォーム定義のフィールド追加・並べ替え・削除・設定更新を扱う service。
 */
@Injectable()
export class FormDefinitionFieldsService {
  constructor(
    private readonly formDefinitionsRepository: FormDefinitionsRepository,
    private readonly formFieldsRepository: FormFieldsRepository,
    private readonly spaceAccess: SpaceAccessService,
  ) {}

  /**
   * 下書きフォーム定義にフィールドを追加する。
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
    const definition = await this.findDraftDefinitionOrThrow(
      actor.tenantId,
      definitionId,
    );
    await this.assertCanManageDefinition(actor, definition);

    const key = dto.fieldKey.trim();
    const existing = await this.formFieldsRepository.findFieldByKey(
      definitionId,
      key,
    );
    if (existing) {
      throw clientError(ClientErrorCodes.FORM_FIELD_KEY_EXISTS);
    }

    return this.formFieldsRepository.createField({
      tenantId: actor.tenantId,
      formDefinitionId: definitionId,
      fieldKey: key,
      label: dto.label.trim(),
      fieldType: dto.fieldType,
      required: dto.required,
      placeholder: dto.placeholder?.trim().length
        ? dto.placeholder.trim()
        : null,
      helpText: dto.helpText?.trim().length ? dto.helpText.trim() : null,
      optionsJson:
        dto.options !== undefined && dto.options !== null ? dto.options : null,
      sortOrder: dto.sortOrder,
    });
  }

  /**
   * 下書きフォーム定義内でフィールド順序を 1 つ移動する。
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
    const definition = await this.findDraftDefinitionOrThrow(
      actor.tenantId,
      definitionId,
    );
    await this.assertCanManageDefinition(actor, definition);
    const rows = await this.formFieldsRepository.findFieldsOrdered(
      actor.tenantId,
      definitionId,
    );
    const fromIndex = rows.findIndex((f) => f.id === fieldId);
    if (fromIndex < 0) {
      throw clientError(ClientErrorCodes.FORM_FIELD_NOT_FOUND);
    }

    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= rows.length) {
      return;
    }

    const [target] = rows.splice(fromIndex, 1);
    rows.splice(toIndex, 0, target);

    const normalized = this.normalizeSortOrder(rows);
    await this.formFieldsRepository.saveFields(normalized);
  }

  /**
   * 下書きフォーム定義からフィールドを削除し、残りの sortOrder を正規化する。
   * @param actor ログインユーザー
   * @param definitionId フォーム定義ID
   * @param fieldId フォームフィールドID
   */
  async deleteField(
    actor: AuthUserPayload,
    definitionId: string,
    fieldId: string,
  ): Promise<void> {
    const definition = await this.findDraftDefinitionOrThrow(
      actor.tenantId,
      definitionId,
    );
    await this.assertCanManageDefinition(actor, definition);
    const target = await this.formFieldsRepository.findFieldByIdInDefinition({
      tenantId: actor.tenantId,
      definitionId,
      fieldId,
    });
    if (!target) {
      throw clientError(ClientErrorCodes.FORM_FIELD_NOT_FOUND);
    }
    await this.formFieldsRepository.removeField(target);

    const remaining = await this.formFieldsRepository.findFieldsOrdered(
      actor.tenantId,
      definitionId,
    );
    const normalized = this.normalizeSortOrder(remaining);
    if (normalized.length > 0) {
      await this.formFieldsRepository.saveFields(normalized);
    }
  }

  /**
   * 下書きフォームフィールドの表示・入力設定を更新する。
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
    const definition = await this.findDraftDefinitionOrThrow(
      actor.tenantId,
      definitionId,
    );
    await this.assertCanManageDefinition(actor, definition);
    const target = await this.formFieldsRepository.findFieldByIdInDefinition({
      tenantId: actor.tenantId,
      definitionId,
      fieldId,
    });
    if (!target) {
      throw clientError(ClientErrorCodes.FORM_FIELD_NOT_FOUND);
    }
    if (dto.label !== undefined && dto.label.trim().length > 0) {
      target.label = dto.label.trim();
    }
    target.fieldType = dto.fieldType;
    target.required = dto.required;
    target.placeholder = dto.placeholder?.trim().length
      ? dto.placeholder.trim()
      : null;
    target.helpText = dto.helpText?.trim().length ? dto.helpText.trim() : null;
    target.optionsJson =
      dto.options !== undefined && dto.options !== null ? dto.options : null;
    await this.formFieldsRepository.saveField(target);
  }

  /**
   * 編集可能な下書きフォーム定義を読み込む。
   * @param tenantId テナントID
   * @param id フォーム定義ID
   * @returns 下書きフォーム定義
   */
  private async findDraftDefinitionOrThrow(
    tenantId: string,
    id: string,
  ): Promise<FormDefinition> {
    const definition =
      await this.formDefinitionsRepository.findByIdWithFieldsInTenant(
        tenantId,
        id,
      );
    if (!definition) {
      throw clientError(ClientErrorCodes.FORM_DEFINITION_NOT_FOUND);
    }
    if (definition.status !== FormDefinitionStatus.DRAFT) {
      throw clientError(ClientErrorCodes.FORM_DEFINITION_IMMUTABLE);
    }
    return definition;
  }

  /**
   * フォーム定義の space 管理権限を検証する。
   * @param actor ログインユーザー
   * @param definition フォーム定義
   */
  private async assertCanManageDefinition(
    actor: AuthUserPayload,
    definition: FormDefinition,
  ): Promise<void> {
    await this.spaceAccess.assertCanManageGroup(actor, definition.groupId);
  }

  /**
   * フィールド配列の sortOrder を 0 始まりで振り直す。
   * @param fields フォームフィールド一覧
   * @returns sortOrder 正規化済みフィールド一覧
   */
  private normalizeSortOrder(fields: FormField[]): FormField[] {
    return fields.map((field, index) => {
      field.sortOrder = index;
      return field;
    });
  }
}
