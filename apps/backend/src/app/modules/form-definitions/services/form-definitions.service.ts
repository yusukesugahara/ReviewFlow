import { Injectable } from '@nestjs/common';
import { ClientErrorCodes, clientError } from '../../../../common/errors';
import type { AuthUserPayload } from '../../../../decorators/current-user.decorator';
import { FormDefinitionStatus } from '../../../../models/constants/form-definition-status';
import { FormField } from '../../../../models/entities/form-field.entity';
import { FormDefinition } from '../../../../models/entities/form-definition.entity';
import { FormDefinitionsRepository } from '../../../../models/repositories/form-definitions.repository';
import type { ApplicantAccessTokenPayload } from '../../auth/services/auth.service';
import { SpaceAccessService } from '../../groups/services/space-access.service';
import type {
  CreateFormFieldDto,
  CreateFormDefinitionDto,
  RequestFormAccessDto,
  UpdateFormDefinitionDescriptionDto,
  UpdateFormFieldSettingsDto,
} from '../dto/form-definitions.dto';
import {
  mapFormFieldToDto,
  mapFormDefinitionToDto,
} from '../mappers/form-definitions.mapper';
import { FormAccessRequestService } from './form-access-request.service';
import { FormDefinitionFieldsService } from './form-definition-fields.service';

@Injectable()
export class FormDefinitionsService {
  constructor(
    private readonly formDefinitionsRepository: FormDefinitionsRepository,
    private readonly formDefinitionFields: FormDefinitionFieldsService,
    private readonly formAccessRequests: FormAccessRequestService,
    private readonly spaceAccess: SpaceAccessService,
  ) {}

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

  private async assertCanManageDefinition(
    actor: AuthUserPayload,
    definition: FormDefinition,
  ): Promise<void> {
    await this.spaceAccess.assertCanManageGroup(actor, definition.groupId);
  }

  async addField(
    actor: AuthUserPayload,
    definitionId: string,
    dto: CreateFormFieldDto,
  ): Promise<FormField> {
    return this.formDefinitionFields.addField(actor, definitionId, dto);
  }

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

  async deleteField(
    actor: AuthUserPayload,
    definitionId: string,
    fieldId: string,
  ): Promise<void> {
    await this.formDefinitionFields.deleteField(actor, definitionId, fieldId);
  }

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

  async publish(
    actor: AuthUserPayload,
    definitionId: string,
  ): Promise<FormDefinition> {
    const t = await this.formDefinitionsRepository.findByIdWithFields(
      actor.tenantId,
      definitionId,
    );
    if (!t) {
      throw clientError(ClientErrorCodes.FORM_DEFINITION_NOT_FOUND);
    }
    if (t.status !== FormDefinitionStatus.DRAFT) {
      throw clientError(ClientErrorCodes.FORM_DEFINITION_NOT_PUBLISHABLE);
    }
    await this.assertCanManageDefinition(actor, t);
    t.status = FormDefinitionStatus.PUBLISHED;
    return this.formDefinitionsRepository.saveDefinition(t);
  }

  async archive(
    actor: AuthUserPayload,
    definitionId: string,
  ): Promise<FormDefinition> {
    const definition = await this.getOne(actor.tenantId, definitionId);
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
    const definition = await this.getOne(actor.tenantId, definitionId);
    await this.assertCanManageDefinition(actor, definition);
    if (definition.status !== FormDefinitionStatus.ARCHIVED) {
      return definition;
    }
    definition.status =
      definition.archivedFromStatus ?? FormDefinitionStatus.PUBLISHED;
    definition.archivedFromStatus = null;
    return this.formDefinitionsRepository.saveDefinition(definition);
  }

  async getOne(
    tenantId: string,
    definitionId: string,
  ): Promise<FormDefinition> {
    const t = await this.formDefinitionsRepository.findByIdWithFields(
      tenantId,
      definitionId,
    );
    if (!t) {
      throw clientError(ClientErrorCodes.FORM_DEFINITION_NOT_FOUND);
    }
    return t;
  }

  async getOneForActor(
    actor: AuthUserPayload,
    definitionId: string,
  ): Promise<FormDefinition> {
    const definition = await this.getOne(actor.tenantId, definitionId);
    await this.spaceAccess.assertCanUseGroup(actor, definition.groupId);
    return definition;
  }

  async updateDescription(
    actor: AuthUserPayload,
    definitionId: string,
    dto: UpdateFormDefinitionDescriptionDto,
  ): Promise<FormDefinition> {
    const definition = await this.getOne(actor.tenantId, definitionId);
    await this.assertCanManageDefinition(actor, definition);
    definition.description = dto.description?.trim().length
      ? dto.description.trim()
      : null;
    return this.formDefinitionsRepository.saveDefinition(definition);
  }

  async getPublishedDefinitionForApplicant(
    actor: ApplicantAccessTokenPayload,
  ): Promise<FormDefinition> {
    return this.formAccessRequests.getPublishedDefinitionForApplicant(actor);
  }

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

  toResponse(t: FormDefinition) {
    return mapFormDefinitionToDto(t);
  }

  fieldToDto(f: FormField) {
    return mapFormFieldToDto(f);
  }
}
