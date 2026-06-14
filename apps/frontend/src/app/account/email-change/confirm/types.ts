export type AccountEmailChangeConfirmPageProps = {
  searchParams?: Promise<{
    formError?: string;
    token?: string;
  }>;
};

export type AccountEmailChangeConfirmViewProps = {
  formError?: string;
  token: string;
};
