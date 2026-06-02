export type PublicApplicationAccessPageProps = {
  params: Promise<{ groupId: string }>;
  searchParams?: Promise<{
    sent?: string;
    formError?: string;
    formDefinitionId?: string;
  }>;
};

export type PublicApplicationAccessViewProps = {
  groupId: string;
  sent: boolean;
  formError?: string;
  formDefinitionId: string;
};
