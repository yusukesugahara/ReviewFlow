import type {
  FormFieldResponseDto,
  FormDefinitionResponseDto,
} from '../dto/form-definitions.dto';
import type { FormField } from '../../../../models/entities/form-field.entity';
import type { FormDefinition } from '../../../../models/entities/form-definition.entity';

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

export function mapFormDefinitionToDto(
  t: FormDefinition,
): FormDefinitionResponseDto {
  const fields = (t.fields ?? [])
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder);
  return {
    id: t.id,
    groupId: t.groupId,
    name: t.name,
    description: t.description,
    status: t.status,
    createdByUserId: t.createdByUserId,
    fields: fields.map(mapFormFieldToDto),
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}
