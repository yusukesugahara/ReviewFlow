import type {
  FormFieldResponseDto,
  FormTemplateResponseDto,
} from './form-templates.dto';
import type { FormField } from '../../../models/entities/form-field.entity';
import type { FormTemplate } from '../../../models/entities/form-template.entity';

export function mapFormFieldToDto(f: FormField): FormFieldResponseDto {
  return {
    id: f.id,
    fieldKey: f.fieldKey,
    label: f.label,
    fieldType: f.fieldType,
    required: f.required,
    placeholder: f.placeholder,
    helpText: f.helpText,
    options: f.optionsJson ?? null,
    sortOrder: f.sortOrder,
    createdAt: f.createdAt.toISOString(),
  };
}

export function mapFormTemplateToDto(t: FormTemplate): FormTemplateResponseDto {
  const fields = (t.fields ?? [])
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder);
  return {
    id: t.id,
    name: t.name,
    description: t.description,
    status: t.status,
    createdByUserId: t.createdByUserId,
    fields: fields.map(mapFormFieldToDto),
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}
