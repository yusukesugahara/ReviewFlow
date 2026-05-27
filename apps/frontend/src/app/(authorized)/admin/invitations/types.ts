import type { TenantUserSummary } from "@/lib/schema";

export type AdminInvitationsPageProps = {
  searchParams?: Promise<{
    sent?: string;
    email?: string;
    role?: string;
    expiresAt?: string;
    error?: string;
    formError?: string;
  }>;
};

export type AdminInvitationsViewProps = Awaited<
  NonNullable<AdminInvitationsPageProps["searchParams"]>
> & {
  currentUserId: string | null;
  userListError?: string;
  users: TenantUserSummary[];
};
