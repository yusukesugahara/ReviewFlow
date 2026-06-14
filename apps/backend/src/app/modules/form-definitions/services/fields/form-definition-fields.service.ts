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

@Injectable()
export class FormDefinitionFieldsService {
  constructor(
    private readonly formDefinitionsRepository: FormDefinitionsRepository,
    private readonly formFieldsRepository: FormFieldsRepository,
    private readonly spaceAccess: SpaceAccessService,
  ) {}

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

  private async findDraftDefinitionOrThrow(
    tenantId: string,
    id: string,
  ): Promise<FormDefinition> {
    const definition = await this.formDefinitionsRepository.findByIdWithFields(
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

  private async assertCanManageDefinition(
    actor: AuthUserPayload,
    definition: FormDefinition,
  ): Promise<void> {
    await this.spaceAccess.assertCanManageGroup(actor, definition.groupId);
  }

  private normalizeSortOrder(fields: FormField[]): FormField[] {
    return fields.map((field, index) => {
      field.sortOrder = index;
      return field;
    });
  }
}
