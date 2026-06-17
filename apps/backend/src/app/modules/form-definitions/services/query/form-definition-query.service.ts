import { Injectable } from '@nestjs/common';
import { ClientErrorCodes, clientError } from '../../../../../common/errors';
import type { AuthUserPayload } from '../../../../../decorators/current-user.decorator';
import { FormDefinition } from '../../../../../models/entities/form-definition.entity';
import { FormDefinitionsRepository } from '../../../../../models/repositories/form-definitions.repository';
import { SpaceAccessService } from '../../../groups/services/access/space-access.service';

/**
 * ログインユーザー向けフォーム定義検索・詳細取得を扱う query service。
 */
@Injectable()
export class FormDefinitionQueryService {
  constructor(
    private readonly formDefinitionsRepository: FormDefinitionsRepository,
    private readonly spaceAccess: SpaceAccessService,
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
    await this.spaceAccess.assertCanManageGroup(actor, groupId);
    return this.formDefinitionsRepository.listByGroup({
      tenantId: actor.tenantId,
      groupId,
      includeArchived,
    });
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
    await this.spaceAccess.assertCanManageGroup(actor, groupId);
    const row = await this.formDefinitionsRepository.findOneByGroup({
      tenantId: actor.tenantId,
      groupId,
    });
    if (!row) {
      throw clientError(ClientErrorCodes.FORM_DEFINITION_NOT_FOUND);
    }
    return row;
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
    const definition =
      await this.formDefinitionsRepository.findByIdWithFieldsInTenant(
        tenantId,
        definitionId,
      );
    if (!definition) {
      throw clientError(ClientErrorCodes.FORM_DEFINITION_NOT_FOUND);
    }
    return definition;
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
    const definition = await this.getOne(actor.tenantId, definitionId);
    await this.spaceAccess.assertCanUseGroup(actor, definition.groupId);
    return definition;
  }
}
