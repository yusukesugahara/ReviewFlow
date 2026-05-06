import { AdminInvitationsView } from "./view";

type PageProps = {
  searchParams?: Promise<{
    token?: string;
    email?: string;
    role?: string;
    expiresAt?: string;
    error?: string;
  }>;
};

export default async function AdminInvitationsPage({
  searchParams,
}: PageProps) {
  const params = (await searchParams) ?? {};
  return <AdminInvitationsView {...params} />;
}
