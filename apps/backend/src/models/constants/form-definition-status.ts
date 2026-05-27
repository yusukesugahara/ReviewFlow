export const FormDefinitionStatus = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
} as const;

export type FormDefinitionStatusValue =
  (typeof FormDefinitionStatus)[keyof typeof FormDefinitionStatus];
