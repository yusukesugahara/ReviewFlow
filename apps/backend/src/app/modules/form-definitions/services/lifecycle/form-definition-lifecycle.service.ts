import { Injectable } from '@nestjs/common';
import { ClientErrorCodes, clientError } from '../../../../../common/errors';
import type { AuthUserPayload } from '../../../../../decorators/current-user.decorator';
import { FormDefinitionStatus } from '../../../../../models/constants/form-definition-status';
import { FormDefinition } from '../../../../../models/entities/form-definition.entity';
import { FormDefinitionsRepository } from '../../../../../models/repositories/form-definitions.repository';
import { SpaceAccessService } from '../../../groups/services/access/space-access.service';
import type { UpdateFormDefinitionDescriptionDto } from '../../dto/form-definitions.dto';

@Injectable()
export class FormDefinitionLifecycleService {
  constructor(
    private readonly formDefinitionsRepository: FormDefinitionsRepository,
    private readonly spaceAccess: SpaceAccessService,
  ) {}

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

  private async assertCanManageDefinition(
    actor: AuthUserPayload,
    definition: FormDefinition,
  ): Promise<void> {
    await this.spaceAccess.assertCanManageGroup(actor, definition.groupId);
  }
}
