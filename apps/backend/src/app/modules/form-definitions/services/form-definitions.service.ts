import { Injectable } from '@nestjs/common';
import type { AuthUserPayload } from '../../../../decorators/current-user.decorator';
import { FormField } from '../../../../models/entities/form-field.entity';
import { FormDefinition } from '../../../../models/entities/form-definition.entity';
import type { ApplicantAccessTokenPayload } from '../../auth/services/auth.service';
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
import { FormDefinitionCreationService } from './form-definition-creation.service';
import { FormDefinitionFieldsService } from './form-definition-fields.service';
import { FormDefinitionLifecycleService } from './form-definition-lifecycle.service';
import { FormDefinitionQueryService } from './form-definition-query.service';

@Injectable()
export class FormDefinitionsService {
  constructor(
    private readonly formDefinitionCreation: FormDefinitionCreationService,
    private readonly formDefinitionQuery: FormDefinitionQueryService,
    private readonly formDefinitionFields: FormDefinitionFieldsService,
    private readonly formAccessRequests: FormAccessRequestService,
    private readonly formDefinitionLifecycle: FormDefinitionLifecycleService,
  ) {}

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

  async getOneByGroupForActor(
    actor: AuthUserPayload,
    groupId: string,
  ): Promise<FormDefinition> {
    return this.formDefinitionQuery.getOneByGroupForActor(actor, groupId);
  }

  async create(
    actor: AuthUserPayload,
    dto: CreateFormDefinitionDto,
  ): Promise<FormDefinition> {
    return this.formDefinitionCreation.create(actor, dto);
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
    return this.formDefinitionQuery.getOne(tenantId, definitionId);
  }

  async getOneForActor(
    actor: AuthUserPayload,
    definitionId: string,
  ): Promise<FormDefinition> {
    return this.formDefinitionQuery.getOneForActor(actor, definitionId);
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
