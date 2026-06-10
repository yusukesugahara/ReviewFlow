import { Injectable } from '@nestjs/common';
import { ClientErrorCodes, clientError } from '../../../../common/errors';
import type { AuthUserPayload } from '../../../../decorators/current-user.decorator';
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
import { FormDefinitionLifecycleService } from './form-definition-lifecycle.service';

@Injectable()
export class FormDefinitionsService {
  constructor(
    private readonly formDefinitionsRepository: FormDefinitionsRepository,
    private readonly formDefinitionFields: FormDefinitionFieldsService,
    private readonly formAccessRequests: FormAccessRequestService,
    private readonly formDefinitionLifecycle: FormDefinitionLifecycleService,
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
    return this.formDefinitionLifecycle.publish(actor, definitionId);
  }

  async archive(
    actor: AuthUserPayload,
    definitionId: string,
  ): Promise<FormDefinition> {
    return this.formDefinitionLifecycle.archive(actor, definitionId);
  }

  async restore(
    actor: AuthUserPayload,
    definitionId: string,
  ): Promise<FormDefinition> {
    return this.formDefinitionLifecycle.restore(actor, definitionId);
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
    return this.formDefinitionLifecycle.updateDescription(
      actor,
      definitionId,
      dto,
    );
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
