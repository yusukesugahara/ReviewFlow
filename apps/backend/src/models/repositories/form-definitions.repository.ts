import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { FormDefinitionStatus } from '../constants/form-definition-status';
import { FormDefinition } from '../entities/form-definition.entity';
import { FormField } from '../entities/form-field.entity';

@Injectable()
export class FormDefinitionsRepository {
  constructor(
    @InjectRepository(FormDefinition)
    private readonly definitions: Repository<FormDefinition>,
    @InjectRepository(FormField)
    private readonly fields: Repository<FormField>,
  ) {}

  listByGroup(params: {
    tenantId: string;
    groupId: string;
    includeArchived: boolean;
  }): Promise<FormDefinition[]> {
    return this.definitions.find({
      where: {
        tenantId: params.tenantId,
        groupId: params.groupId,
        ...(params.includeArchived
          ? { status: FormDefinitionStatus.ARCHIVED }
          : { status: Not(FormDefinitionStatus.ARCHIVED) }),
      },
      relations: ['fields'],
      order: { updatedAt: 'DESC', fields: { sortOrder: 'ASC' } },
    });
  }

  findOneByGroup(params: {
    tenantId: string;
    groupId: string;
  }): Promise<FormDefinition | null> {
    return this.definitions.findOne({
      where: { tenantId: params.tenantId, groupId: params.groupId },
      relations: ['fields'],
      order: { fields: { sortOrder: 'ASC' } },
    });
  }

  createDefinition(params: {
    tenantId: string;
    groupId: string;
    name: string;
    description: string | null;
    createdByUserId: string;
  }): Promise<FormDefinition> {
    return this.definitions.save(
      this.definitions.create({
        tenantId: params.tenantId,
        groupId: params.groupId,
        name: params.name,
        description: params.description,
        status: FormDefinitionStatus.DRAFT,
        createdByUserId: params.createdByUserId,
      }),
    );
  }

  findByIdWithFields(
    tenantId: string,
    definitionId: string,
  ): Promise<FormDefinition | null> {
    return this.definitions.findOne({
      where: { id: definitionId, tenantId },
      relations: ['fields'],
    });
  }

  findTemplateByIdInGroup(params: {
    tenantId: string;
    groupId: string;
    formDefinitionId: string;
    onlyPublished?: boolean;
  }): Promise<FormDefinition | null> {
    return this.definitions.findOne({
      where: {
        id: params.formDefinitionId,
        tenantId: params.tenantId,
        groupId: params.groupId,
        ...(params.onlyPublished
          ? { status: FormDefinitionStatus.PUBLISHED }
          : {}),
      },
      relations: ['fields'],
    });
  }

  findPublishedTemplatesForApplicationCreation(params: {
    tenantId: string;
    groupId: string;
    formDefinitionId?: string;
  }): Promise<FormDefinition[]> {
    return this.definitions.find({
      where: {
        ...(params.formDefinitionId ? { id: params.formDefinitionId } : {}),
        tenantId: params.tenantId,
        groupId: params.groupId,
        status: FormDefinitionStatus.PUBLISHED,
      },
      relations: ['fields'],
    });
  }

  findFieldByKey(
    definitionId: string,
    fieldKey: string,
  ): Promise<FormField | null> {
    return this.fields.findOne({
      where: { formDefinitionId: definitionId, fieldKey },
    });
  }

  createField(params: {
    tenantId: string;
    formDefinitionId: string;
    fieldKey: string;
    label: string;
    fieldType: FormField['fieldType'];
    required: boolean;
    placeholder: string | null;
    helpText: string | null;
    optionsJson: unknown[] | null;
    sortOrder: number;
  }): Promise<FormField> {
    return this.fields.save(this.fields.create(params));
  }

  findFieldsOrdered(
    tenantId: string,
    definitionId: string,
  ): Promise<FormField[]> {
    return this.fields.find({
      where: { tenantId, formDefinitionId: definitionId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  saveFields(fields: FormField[]): Promise<FormField[]> {
    return this.fields.save(fields);
  }

  findFieldByIdInDefinition(params: {
    tenantId: string;
    definitionId: string;
    fieldId: string;
  }): Promise<FormField | null> {
    return this.fields.findOne({
      where: {
        id: params.fieldId,
        tenantId: params.tenantId,
        formDefinitionId: params.definitionId,
      },
    });
  }

  async removeField(field: FormField): Promise<void> {
    await this.fields.remove(field);
  }

  saveField(field: FormField): Promise<FormField> {
    return this.fields.save(field);
  }

  saveDefinition(definition: FormDefinition): Promise<FormDefinition> {
    return this.definitions.save(definition);
  }

  findPublishedForApplicant(params: {
    tenantId: string;
    groupId: string;
    formDefinitionId?: string;
  }): Promise<FormDefinition | null> {
    return this.definitions.findOne({
      where: {
        ...(params.formDefinitionId ? { id: params.formDefinitionId } : {}),
        tenantId: params.tenantId,
        groupId: params.groupId,
        status: FormDefinitionStatus.PUBLISHED,
      },
      relations: ['fields'],
      order: { fields: { sortOrder: 'ASC' } },
    });
  }

  findPublishedForAccessRequest(params: {
    groupId: string;
    formDefinitionId?: string;
  }): Promise<FormDefinition[]> {
    return this.definitions.find({
      where: {
        ...(params.formDefinitionId ? { id: params.formDefinitionId } : {}),
        groupId: params.groupId,
        status: FormDefinitionStatus.PUBLISHED,
      },
    });
  }
}
