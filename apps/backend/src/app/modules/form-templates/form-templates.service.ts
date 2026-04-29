import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientErrorCodes, clientError } from '../../../common/errors';
import type { AuthUserPayload } from '../../../decorators/current-user.decorator';
import { FormTemplateStatus } from '../../../models/constants/form-template-status';
import { GroupMemberRole } from '../../../models/constants/group-member-role';
import { UserRole } from '../../../models/constants/user-role';
import { FormField } from '../../../models/entities/form-field.entity';
import { FormTemplate } from '../../../models/entities/form-template.entity';
import { GroupMember } from '../../../models/entities/group-member.entity';
import { Group } from '../../../models/entities/group.entity';
import { MailService } from '../mail/mail.service';
import {
  AuthService,
  type ApplicantAccessTokenPayload,
} from '../auth/auth.service';
import type {
  CreateFormFieldDto,
  CreateFormTemplateDto,
  RequestFormAccessDto,
  UpdateFormFieldSettingsDto,
} from './form-templates.dto';
import {
  mapFormFieldToDto,
  mapFormTemplateToDto,
} from './form-templates.mapper';

@Injectable()
export class FormTemplatesService {
  private readonly logger = new Logger(FormTemplatesService.name);

  constructor(
    @InjectRepository(FormTemplate)
    private readonly templates: Repository<FormTemplate>,
    @InjectRepository(FormField)
    private readonly fields: Repository<FormField>,
    @InjectRepository(Group)
    private readonly groups: Repository<Group>,
    @InjectRepository(GroupMember)
    private readonly members: Repository<GroupMember>,
    private readonly mailService: MailService,
    private readonly authService: AuthService,
  ) {}

  private async assertGroupInTenant(
    tenantId: string,
    groupId: string,
  ): Promise<void> {
    const count = await this.groups.count({ where: { id: groupId, tenantId } });
    if (count === 0) {
      throw clientError(ClientErrorCodes.GROUP_NOT_FOUND);
    }
  }

  private async assertCanManageGroup(
    actor: AuthUserPayload,
    groupId: string,
  ): Promise<void> {
    await this.assertGroupInTenant(actor.tenantId, groupId);
    if (actor.roles.includes(UserRole.TENANT_ADMIN)) {
      return;
    }
    const member = await this.members.findOne({
      where: {
        tenantId: actor.tenantId,
        groupId,
        userId: actor.id,
        role: GroupMemberRole.ADMIN,
      },
    });
    if (!member) {
      throw clientError(ClientErrorCodes.GROUP_ADMIN_REQUIRED);
    }
  }

  async listByGroup(
    actor: AuthUserPayload,
    groupId: string,
  ): Promise<FormTemplate[]> {
    await this.assertCanManageGroup(actor, groupId);
    return this.templates.find({
      where: { tenantId: actor.tenantId, groupId },
      relations: ['fields'],
      order: { updatedAt: 'DESC' },
    });
  }

  async create(
    actor: AuthUserPayload,
    dto: CreateFormTemplateDto,
  ): Promise<FormTemplate> {
    await this.assertCanManageGroup(actor, dto.groupId);
    const row = this.templates.create({
      tenantId: actor.tenantId,
      groupId: dto.groupId,
      name: dto.name.trim(),
      description: dto.description?.trim().length
        ? dto.description.trim()
        : null,
      status: FormTemplateStatus.DRAFT,
      createdByUserId: actor.id,
    });
    return this.templates.save(row);
  }

  private async findDraftTemplateOrThrow(
    tenantId: string,
    id: string,
  ): Promise<FormTemplate> {
    const t = await this.templates.findOne({
      where: { id, tenantId },
      relations: ['fields'],
    });
    if (!t) {
      throw clientError(ClientErrorCodes.FORM_TEMPLATE_NOT_FOUND);
    }
    if (t.status !== FormTemplateStatus.DRAFT) {
      throw clientError(ClientErrorCodes.FORM_TEMPLATE_IMMUTABLE);
    }
    return t;
  }

  private async assertCanManageTemplate(
    actor: AuthUserPayload,
    template: FormTemplate,
  ): Promise<void> {
    await this.assertCanManageGroup(actor, template.groupId);
  }

  async addField(
    actor: AuthUserPayload,
    templateId: string,
    dto: CreateFormFieldDto,
  ): Promise<FormField> {
    const template = await this.findDraftTemplateOrThrow(
      actor.tenantId,
      templateId,
    );
    await this.assertCanManageTemplate(actor, template);

    const key = dto.fieldKey.trim();
    const existing = await this.fields.findOne({
      where: { formTemplateId: templateId, fieldKey: key },
    });
    if (existing) {
      throw clientError(ClientErrorCodes.FORM_FIELD_KEY_EXISTS);
    }

    const row = this.fields.create({
      tenantId: actor.tenantId,
      formTemplateId: templateId,
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
    templateId: string,
    fieldId: string,
    direction: 'up' | 'down',
  ): Promise<void> {
    const template = await this.findDraftTemplateOrThrow(
      actor.tenantId,
      templateId,
    );
    await this.assertCanManageTemplate(actor, template);
    const rows = await this.fields.find({
      where: { tenantId: actor.tenantId, formTemplateId: templateId },
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
    templateId: string,
    fieldId: string,
  ): Promise<void> {
    const template = await this.findDraftTemplateOrThrow(
      actor.tenantId,
      templateId,
    );
    await this.assertCanManageTemplate(actor, template);
    const target = await this.fields.findOne({
      where: {
        id: fieldId,
        tenantId: actor.tenantId,
        formTemplateId: templateId,
      },
    });
    if (!target) {
      throw clientError(ClientErrorCodes.FORM_FIELD_NOT_FOUND);
    }
    await this.fields.remove(target);

    const remaining = await this.fields.find({
      where: { tenantId: actor.tenantId, formTemplateId: templateId },
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
    templateId: string,
    fieldId: string,
    dto: UpdateFormFieldSettingsDto,
  ): Promise<void> {
    const template = await this.findDraftTemplateOrThrow(
      actor.tenantId,
      templateId,
    );
    await this.assertCanManageTemplate(actor, template);
    const target = await this.fields.findOne({
      where: {
        id: fieldId,
        tenantId: actor.tenantId,
        formTemplateId: templateId,
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
    templateId: string,
  ): Promise<FormTemplate> {
    const t = await this.templates.findOne({
      where: { id: templateId, tenantId: actor.tenantId },
      relations: ['fields'],
    });
    if (!t) {
      throw clientError(ClientErrorCodes.FORM_TEMPLATE_NOT_FOUND);
    }
    if (t.status !== FormTemplateStatus.DRAFT) {
      throw clientError(ClientErrorCodes.FORM_TEMPLATE_NOT_PUBLISHABLE);
    }
    await this.assertCanManageTemplate(actor, t);
    t.status = FormTemplateStatus.PUBLISHED;
    return this.templates.save(t);
  }

  async getOne(tenantId: string, templateId: string): Promise<FormTemplate> {
    const t = await this.templates.findOne({
      where: { id: templateId, tenantId },
      relations: ['fields'],
    });
    if (!t) {
      throw clientError(ClientErrorCodes.FORM_TEMPLATE_NOT_FOUND);
    }
    return t;
  }

  async getOneForActor(
    actor: AuthUserPayload,
    templateId: string,
  ): Promise<FormTemplate> {
    const template = await this.getOne(actor.tenantId, templateId);
    await this.assertCanManageTemplate(actor, template);
    return template;
  }

  async getPublishedTemplateForApplicant(
    actor: ApplicantAccessTokenPayload,
  ): Promise<FormTemplate> {
    const template = await this.templates.findOne({
      where: {
        id: actor.templateId,
        tenantId: actor.tenantId,
        status: FormTemplateStatus.PUBLISHED,
      },
      relations: ['fields'],
    });
    if (!template) {
      throw clientError(ClientErrorCodes.FORM_TEMPLATE_NOT_FOUND);
    }
    return template;
  }

  async requestAccess(templateId: string, dto: RequestFormAccessDto) {
    const template = await this.templates.findOne({
      where: { id: templateId, status: FormTemplateStatus.PUBLISHED },
    });
    if (!template) {
      throw clientError(ClientErrorCodes.FORM_TEMPLATE_NOT_FOUND);
    }

    const email = dto.email.toLowerCase();
    const accessToken = this.authService.issueApplicantAccessToken({
      tenantId: template.tenantId,
      email,
      templateId: template.id,
    });

    try {
      await this.mailService.sendApplicationAccessEmail({
        to: email,
        templateName: template.name,
        accessToken,
      });
    } catch (error) {
      this.logger.error(
        `failed to send form access email for template ${template.id} to ${email}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(
        'failed to send form access email',
      );
    }

    return { accepted: true as const };
  }

  toResponse(t: FormTemplate) {
    return mapFormTemplateToDto(t);
  }

  fieldToDto(f: FormField) {
    return mapFormFieldToDto(f);
  }
}
