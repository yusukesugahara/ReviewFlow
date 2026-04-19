import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientErrorCodes, clientError } from '../../../common/errors';
import { FormTemplateStatus } from '../../../models/constants/form-template-status';
import { FormField } from '../../../models/entities/form-field.entity';
import { FormTemplate } from '../../../models/entities/form-template.entity';
import type { CreateFormFieldDto, CreateFormTemplateDto } from './form-templates.dto';
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
