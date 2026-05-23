export type ForgotPasswordPageProps = {
  searchParams?: Promise<{ sent?: string; formError?: string }>;
};

export type ForgotPasswordViewProps = {
  sent: boolean;
  formError?: string;
};
