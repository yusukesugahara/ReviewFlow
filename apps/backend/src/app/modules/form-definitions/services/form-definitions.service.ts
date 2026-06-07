import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { ClientErrorCodes, clientError } from '../../../../common/errors';
import type { AuthUserPayload } from '../../../../decorators/current-user.decorator';
import { FormDefinitionStatus } from '../../../../models/constants/form-definition-status';
import { FormField } from '../../../../models/entities/form-field.entity';
import { FormDefinition } from '../../../../models/entities/form-definition.entity';
import { MailService } from '../../mail/services/mail.service';
import { AuthService } from '../../auth/services/auth.service';
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

@Injectable()
export class FormDefinitionsService {
  private readonly logger = new Logger(FormDefinitionsService.name);

  constructor(
    @InjectRepository(FormDefinition)
    private readonly definitions: Repository<FormDefinition>,
    @InjectRepository(FormField)
    private readonly fields: Repository<FormField>,
    private readonly spaceAccess: SpaceAccessService,
    private readonly mailService: MailService,
    private readonly authService: AuthService,
  ) {}

  async listByGroup(
    actor: AuthUserPayload,
    groupId: string,
    includeArchived = false,
  ): Promise<FormDefinition[]> {
    await this.spaceAccess.assertCanManageGroup(actor, groupId);
    return this.definitions.find({
      where: {
        tenantId: actor.tenantId,
        groupId,
        ...(includeArchived
          ? { status: FormDefinitionStatus.ARCHIVED }
          : { status: Not(FormDefinitionStatus.ARCHIVED) }),
      },
      relations: ['fields'],
      order: { updatedAt: 'DESC', fields: { sortOrder: 'ASC' } },
    });
  }

  async getOneByGroupForActor(
    actor: AuthUserPayload,
    groupId: string,
  ): Promise<FormDefinition> {
    await this.spaceAccess.assertCanManageGroup(actor, groupId);
    const row = await this.definitions.findOne({
      where: { tenantId: actor.tenantId, groupId },
      relations: ['fields'],
      order: { fields: { sortOrder: 'ASC' } },
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
    const row = this.definitions.create({
      tenantId: actor.tenantId,
      groupId: dto.groupId,
      name: dto.name.trim(),
      description: dto.description?.trim().length
        ? dto.description.trim()
        : null,
      status: FormDefinitionStatus.DRAFT,
      createdByUserId: actor.id,
    });
    return this.definitions.save(row);
  }

  private async findDraftDefinitionOrThrow(
    tenantId: string,
    id: string,
  ): Promise<FormDefinition> {
    const t = await this.definitions.findOne({
      where: { id, tenantId },
      relations: ['fields'],
    });
    if (!t) {
      throw clientError(ClientErrorCodes.FORM_DEFINITION_NOT_FOUND);
    }
    if (t.status !== FormDefinitionStatus.DRAFT) {
      throw clientError(ClientErrorCodes.FORM_DEFINITION_IMMUTABLE);
    }
    return t;
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
    const definition = await this.findDraftDefinitionOrThrow(
      actor.tenantId,
      definitionId,
    );
    await this.assertCanManageDefinition(actor, definition);

    const key = dto.fieldKey.trim();
    const existing = await this.fields.findOne({
      where: { formDefinitionId: definitionId, fieldKey: key },
    });
    if (existing) {
      throw clientError(ClientErrorCodes.FORM_FIELD_KEY_EXISTS);
    }

    const row = this.fields.create({
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
    return this.fields.save(row);
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
    const rows = await this.fields.find({
      where: { tenantId: actor.tenantId, formDefinitionId: definitionId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
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

    // sortOrder が過去データで重複/欠番でも、毎回 0..N-1 に正規化して保存する。
    const normalized = rows.map((field, index) => {
      field.sortOrder = index;
      return field;
    });
    await this.fields.save(normalized);
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
    const target = await this.fields.findOne({
      where: {
        id: fieldId,
        tenantId: actor.tenantId,
        formDefinitionId: definitionId,
      },
    });
    if (!target) {
      throw clientError(ClientErrorCodes.FORM_FIELD_NOT_FOUND);
    }
    await this.fields.remove(target);

    const remaining = await this.fields.find({
      where: { tenantId: actor.tenantId, formDefinitionId: definitionId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
    const normalized = remaining.map((field, index) => {
      field.sortOrder = index;
      return field;
    });
    if (normalized.length > 0) {
      await this.fields.save(normalized);
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
    const target = await this.fields.findOne({
      where: {
        id: fieldId,
        tenantId: actor.tenantId,
        formDefinitionId: definitionId,
      },
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
    await this.fields.save(target);
  }

  async publish(
    actor: AuthUserPayload,
    definitionId: string,
  ): Promise<FormDefinition> {
    const t = await this.definitions.findOne({
      where: { id: definitionId, tenantId: actor.tenantId },
      relations: ['fields'],
    });
    if (!t) {
      throw clientError(ClientErrorCodes.FORM_DEFINITION_NOT_FOUND);
    }
    if (t.status !== FormDefinitionStatus.DRAFT) {
      throw clientError(ClientErrorCodes.FORM_DEFINITION_NOT_PUBLISHABLE);
    }
    await this.assertCanManageDefinition(actor, t);
    t.status = FormDefinitionStatus.PUBLISHED;
    return this.definitions.save(t);
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
    return this.definitions.save(definition);
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
    return this.definitions.save(definition);
  }

  async getOne(
    tenantId: string,
    definitionId: string,
  ): Promise<FormDefinition> {
    const t = await this.definitions.findOne({
      where: { id: definitionId, tenantId },
      relations: ['fields'],
    });
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
    return this.definitions.save(definition);
  }

  async getPublishedDefinitionForApplicant(
    actor: ApplicantAccessTokenPayload,
  ): Promise<FormDefinition> {
    const definition = await this.definitions.findOne({
      where: {
        ...(actor.formDefinitionId ? { id: actor.formDefinitionId } : {}),
        tenantId: actor.tenantId,
        groupId: actor.groupId,
        status: FormDefinitionStatus.PUBLISHED,
      },
      relations: ['fields'],
      order: { fields: { sortOrder: 'ASC' } },
    });
    if (!definition) {
      throw clientError(ClientErrorCodes.FORM_DEFINITION_NOT_FOUND);
    }
    return definition;
  }

  async requestAccess(
    groupId: string,
    dto: RequestFormAccessDto,
    formDefinitionId?: string,
  ) {
    const definitions = await this.definitions.find({
      where: {
        ...(formDefinitionId ? { id: formDefinitionId } : {}),
        groupId,
        status: FormDefinitionStatus.PUBLISHED,
      },
    });
    if (!formDefinitionId && definitions.length > 1) {
      throw clientError(ClientErrorCodes.FORM_DEFINITION_AMBIGUOUS);
    }
    const definition = definitions[0];
    if (!definition) {
      throw clientError(ClientErrorCodes.FORM_DEFINITION_NOT_FOUND);
    }

    const email = dto.email.toLowerCase();
    const accessToken = this.authService.issueApplicantAccessToken({
      tenantId: definition.tenantId,
      email,
      groupId: definition.groupId,
      formDefinitionId: definition.id,
    });

    try {
      await this.mailService.sendApplicationAccessEmail({
        to: email,
        templateName: definition.name,
        accessToken,
      });
    } catch (error) {
      this.logger.error(
        `failed to send form access email for definition ${definition.id} to ${email}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(
        'failed to send form access email',
      );
    }

    return { accepted: true as const };
  }

  toResponse(t: FormDefinition) {
    return mapFormDefinitionToDto(t);
  }

  fieldToDto(f: FormField) {
    return mapFormFieldToDto(f);
  }
}
