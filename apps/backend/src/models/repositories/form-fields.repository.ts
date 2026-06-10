import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FormField } from '../entities/form-field.entity';

@Injectable()
export class FormFieldsRepository {
  constructor(
    @InjectRepository(FormField)
    private readonly fields: Repository<FormField>,
  ) {}

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
}
