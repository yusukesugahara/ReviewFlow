import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ClientErrorCodes, clientError } from '../../../../common/errors';
import type { AuthUserPayload } from '../../../../decorators/current-user.decorator';
import { FormDefinitionStatus } from '../../../../models/constants/form-definition-status';
import { FormField } from '../../../../models/entities/form-field.entity';
import { FormDefinition } from '../../../../models/entities/form-definition.entity';
import { FormDefinitionsRepository } from '../../../../models/repositories/form-definitions.repository';
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
import { FormDefinitionFieldsService } from './form-definition-fields.service';

@Injectable()
export class FormDefinitionsService {
  private readonly logger = new Logger(FormDefinitionsService.name);

  constructor(
    private readonly formDefinitionsRepository: FormDefinitionsRepository,
    private readonly formDefinitionFields: FormDefinitionFieldsService,
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
    const definition =
      await this.formDefinitionsRepository.findPublishedForApplicant({
        tenantId: actor.tenantId,
        groupId: actor.groupId,
        formDefinitionId: actor.formDefinitionId,
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
    const definitions =
      await this.formDefinitionsRepository.findPublishedForAccessRequest({
        groupId,
        formDefinitionId,
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
