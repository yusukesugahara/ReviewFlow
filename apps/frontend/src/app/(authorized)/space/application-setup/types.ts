export type ApplicationSetupRedirectPageProps = {
  searchParams?: Promise<{
    setupError?: string;
    setupStatus?: string;
    publishedGroupId?: string;
    publishedFormDefinitionId?: string;
    spaceId?: string;
  }>;
};
