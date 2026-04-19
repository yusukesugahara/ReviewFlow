export const FormTemplateStatus = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
} as const;

export type FormTemplateStatusValue =
  (typeof FormTemplateStatus)[keyof typeof FormTemplateStatus];
