export type InvitationAcceptPageProps = {
  searchParams?: Promise<{
    token?: string;
    formError?: string;
    next?: string;
  }>;
};

export type InvitationAcceptViewProps = {
  presetToken: string;
  formError?: string;
  next: string;
};
