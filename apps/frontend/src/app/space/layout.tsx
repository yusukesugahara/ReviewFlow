import type { ReactNode } from "react";
import { AppSidebar, type AppSidebarSpace } from "@/components/app-sidebar";
import { backendAuthFetchJson } from "@/lib/server/backend-fetch";
import { getCurrentSessionUser } from "@/lib/server/session";

export const dynamic = "force-dynamic";

type RootSpaceLayoutProps = {
  children: ReactNode;
};

function unwrapData<T>(raw: unknown): T {
  if (!raw || typeof raw !== "object" || !("data" in raw)) {
    throw new Error("invalid success envelope");
  }
  return (raw as { data: T }).data;
}

async function getMySpaces(): Promise<AppSidebarSpace[]> {
  try {
    const raw = await backendAuthFetchJson("/groups");
    return unwrapData<{ groups?: AppSidebarSpace[] }>(raw).groups ?? [];
  } catch {
    return [];
  }
}

export default async function RootSpaceLayout({ children }: RootSpaceLayoutProps) {
  const [spaces, me] = await Promise.all([getMySpaces(), getCurrentSessionUser()]);

  return (
    <AppSidebar
      spaces={spaces}
      userEmail={me?.email}
      userRoles={me?.roles ?? []}
    >
      {children}
    </AppSidebar>
  );
}
