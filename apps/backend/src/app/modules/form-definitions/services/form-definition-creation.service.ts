import { Injectable } from '@nestjs/common';
import type { AuthUserPayload } from '../../../../decorators/current-user.decorator';
import { FormDefinition } from '../../../../models/entities/form-definition.entity';
import { FormDefinitionsRepository } from '../../../../models/repositories/form-definitions.repository';
import { SpaceAccessService } from '../../groups/services/space-access.service';
import type { CreateFormDefinitionDto } from '../dto/form-definitions.dto';

@Injectable()
export class FormDefinitionCreationService {
  constructor(
    private readonly formDefinitionsRepository: FormDefinitionsRepository,
    private readonly spaceAccess: SpaceAccessService,
  ) {}

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
