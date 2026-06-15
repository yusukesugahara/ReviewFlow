import { Injectable } from '@nestjs/common';
import { ClientErrorCodes, clientError } from '../../../../../common/errors';
import type { AuthUserPayload } from '../../../../../decorators/current-user.decorator';
import { FormDefinitionStatus } from '../../../../../models/constants/form-definition-status';
import { FormDefinition } from '../../../../../models/entities/form-definition.entity';
import { FormDefinitionsRepository } from '../../../../../models/repositories/form-definitions.repository';
import { SpaceAccessService } from '../../../groups/services/access/space-access.service';
import type { UpdateFormDefinitionDescriptionDto } from '../../dto/form-definitions.dto';

/**
 * フォーム定義の公開・アーカイブ・復元・説明文更新を扱う service。
 */
@Injectable()
export class FormDefinitionLifecycleService {
  constructor(
    private readonly formDefinitionsRepository: FormDefinitionsRepository,
    private readonly spaceAccess: SpaceAccessService,
  ) {}

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
    const definition = await this.findDefinitionOrThrow(
      actor.tenantId,
      definitionId,
    );
    if (definition.status !== FormDefinitionStatus.DRAFT) {
      throw clientError(ClientErrorCodes.FORM_DEFINITION_NOT_PUBLISHABLE);
    }
    await this.assertCanManageDefinition(actor, definition);
    definition.status = FormDefinitionStatus.PUBLISHED;
    return this.formDefinitionsRepository.saveDefinition(definition);
  }

  /**
   * フォーム定義をアーカイブし、復元用に元の状態を保持する。
   * @param actor ログインユーザー
   * @param definitionId フォーム定義ID
   * @returns アーカイブされたフォーム定義
   */
  async archive(
    actor: AuthUserPayload,
    definitionId: string,
  ): Promise<FormDefinition> {
    const definition = await this.findDefinitionOrThrow(
      actor.tenantId,
      definitionId,
    );
    await this.assertCanManageDefinition(actor, definition);
    if (definition.status === FormDefinitionStatus.ARCHIVED) {
      return definition;
    }
    definition.archivedFromStatus = definition.status;
    definition.status = FormDefinitionStatus.ARCHIVED;
    return this.formDefinitionsRepository.saveDefinition(definition);
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
    const definition = await this.findDefinitionOrThrow(
      actor.tenantId,
      definitionId,
    );
    await this.assertCanManageDefinition(actor, definition);
    if (definition.status !== FormDefinitionStatus.ARCHIVED) {
      return definition;
    }
    definition.status =
      definition.archivedFromStatus ?? FormDefinitionStatus.PUBLISHED;
    definition.archivedFromStatus = null;
    return this.formDefinitionsRepository.saveDefinition(definition);
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
    const definition = await this.findDefinitionOrThrow(
      actor.tenantId,
      definitionId,
    );
    await this.assertCanManageDefinition(actor, definition);
    definition.description = dto.description?.trim().length
      ? dto.description.trim()
      : null;
    return this.formDefinitionsRepository.saveDefinition(definition);
  }

  /**
   * tenant scope 内のフォーム定義をフィールド付きで読み込む。
   * @param tenantId テナントID
   * @param definitionId フォーム定義ID
   * @returns フォーム定義
   */
  private async findDefinitionOrThrow(
    tenantId: string,
    definitionId: string,
  ): Promise<FormDefinition> {
    const definition = await this.formDefinitionsRepository.findByIdWithFields(
      tenantId,
      definitionId,
    );
    if (!definition) {
      throw clientError(ClientErrorCodes.FORM_DEFINITION_NOT_FOUND);
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
}
