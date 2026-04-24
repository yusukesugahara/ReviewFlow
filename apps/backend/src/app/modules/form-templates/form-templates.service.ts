import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientErrorCodes, clientError } from '../../../common/errors';
import { FormTemplateStatus } from '../../../models/constants/form-template-status';
import { FormField } from '../../../models/entities/form-field.entity';
import { FormTemplate } from '../../../models/entities/form-template.entity';
import type {
  CreateFormFieldDto,
  CreateFormTemplateDto,
  UpdateFormFieldSettingsDto,
} from './form-templates.dto';
import { mapFormFieldToDto, mapFormTemplateToDto } from './form-templates.mapper';

@Injectable()
export class FormTemplatesService {
  constructor(
    @InjectRepository(FormTemplate)
    private readonly templates: Repository<FormTemplate>,
    @InjectRepository(FormField)
    private readonly fields: Repository<FormField>,
  ) {}

  async listByTenant(tenantId: string): Promise<FormTemplate[]> {
    return this.templates.find({
      where: { tenantId },
      relations: ['fields'],
      order: { updatedAt: 'DESC' },
    });
  }

  async create(
    tenantId: string,
    dto: CreateFormTemplateDto,
    createdByUserId: string,
  ): Promise<FormTemplate> {
    const row = this.templates.create({
      tenantId,
      name: dto.name.trim(),
      description: dto.description?.trim().length
        ? dto.description.trim()
        : null,
      status: FormTemplateStatus.DRAFT,
      createdByUserId,
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

  async addField(
    tenantId: string,
    templateId: string,
    dto: CreateFormFieldDto,
  ): Promise<FormField> {
    await this.findDraftTemplateOrThrow(tenantId, templateId);

    const key = dto.fieldKey.trim();
    const existing = await this.fields.findOne({
      where: { formTemplateId: templateId, fieldKey: key },
    });
    if (existing) {
      throw clientError(ClientErrorCodes.FORM_FIELD_KEY_EXISTS);
    }

    const row = this.fields.create({
      tenantId,
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
        dto.options !== undefined && dto.options !== null
          ? dto.options
          : null,
      sortOrder: dto.sortOrder,
    });
    return this.fields.save(row);
  }

  async moveField(
    tenantId: string,
    templateId: string,
    fieldId: string,
    direction: 'up' | 'down',
  ): Promise<void> {
    await this.findDraftTemplateOrThrow(tenantId, templateId);
    const rows = await this.fields.find({
      where: { tenantId, formTemplateId: templateId },
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
    tenantId: string,
    templateId: string,
    fieldId: string,
  ): Promise<void> {
    await this.findDraftTemplateOrThrow(tenantId, templateId);
    const target = await this.fields.findOne({
      where: { id: fieldId, tenantId, formTemplateId: templateId },
    });
    if (!target) {
      throw clientError(ClientErrorCodes.FORM_FIELD_NOT_FOUND);
    }
    await this.fields.remove(target);

    const remaining = await this.fields.find({
      where: { tenantId, formTemplateId: templateId },
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
    tenantId: string,
    templateId: string,
    fieldId: string,
    dto: UpdateFormFieldSettingsDto,
  ): Promise<void> {
    await this.findDraftTemplateOrThrow(tenantId, templateId);
    const target = await this.fields.findOne({
      where: { id: fieldId, tenantId, formTemplateId: templateId },
    });
    if (!target) {
      throw clientError(ClientErrorCodes.FORM_FIELD_NOT_FOUND);
    }
    target.fieldType = dto.fieldType;
    target.required = dto.required;
    await this.fields.save(target);
  }

  async publish(tenantId: string, templateId: string): Promise<FormTemplate> {
    const t = await this.templates.findOne({
      where: { id: templateId, tenantId },
      relations: ['fields'],
    });
    if (!t) {
      throw clientError(ClientErrorCodes.FORM_TEMPLATE_NOT_FOUND);
    }
    if (t.status !== FormTemplateStatus.DRAFT) {
      throw clientError(ClientErrorCodes.FORM_TEMPLATE_NOT_PUBLISHABLE);
    }
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

  toResponse(t: FormTemplate) {
    return mapFormTemplateToDto(t);
  }

  fieldToDto(f: FormField) {
    return mapFormFieldToDto(f);
  }
}
