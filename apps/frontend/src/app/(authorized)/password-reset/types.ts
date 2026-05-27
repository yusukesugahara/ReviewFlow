export type PasswordResetPageProps = {
  searchParams?: Promise<{ token?: string; formError?: string }>;
};

export type PasswordResetViewProps = {
  token: string;
  formError?: string;
};
