import { Injectable } from '@nestjs/common';
import type { AuthUserPayload } from '../../../../../decorators/current-user.decorator';
import { FormDefinition } from '../../../../../models/entities/form-definition.entity';
import { FormDefinitionsRepository } from '../../../../../models/repositories/form-definitions.repository';
import { SpaceAccessService } from '../../../groups/services/access/space-access.service';
import type { CreateFormDefinitionDto } from '../../dto/form-definitions.dto';

/**
 * フォーム定義の新規作成を扱う service。
 */
@Injectable()
export class FormDefinitionCreationService {
  constructor(
    private readonly formDefinitionsRepository: FormDefinitionsRepository,
    private readonly spaceAccess: SpaceAccessService,
  ) {}

  /**
   * space 管理権限を検証し、下書きフォーム定義を作成する。
   * @param actor ログインユーザー
   * @param dto フォーム定義作成DTO
   * @returns 作成されたフォーム定義
   */
  async create(
    actor: AuthUserPayload,
    dto: CreateFormDefinitionDto,
  ): Promise<FormDefinition> {
    await this.spaceAccess.assertCanManageGroup(actor, dto.groupId);
    return this.formDefinitionsRepository.createDefinition({
      tenantId: actor.tenantId,
      groupId: dto.groupId,
      name: dto.name.trim(),
      description: dto.description?.trim().length
        ? dto.description.trim()
        : null,
      createdByUserId: actor.id,
    });
  }
}
