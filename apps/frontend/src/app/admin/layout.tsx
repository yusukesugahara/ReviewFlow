import type { ReactNode } from "react";
import { AppSidebar, type AppSidebarSpace } from "@/components/app-sidebar";
import { client } from "@/lib/server/backend-fetch";
import { getAccessTokenFromCookie, getCurrentSessionUser } from "@/lib/server/session";

export const dynamic = "force-dynamic";

type AdminLayoutProps = {
  children: ReactNode;
};

function unwrapData<T>(raw: unknown): T {
  if (!raw || typeof raw !== "object" || !("data" in raw)) {
    throw new Error("invalid success envelope");
  }
  return (raw as { data: T }).data;
}

async function getMySpaces(): Promise<AppSidebarSpace[]> {
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    return [];
  }
  try {
    const response = await client.GET("/groups", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.response.ok || !response.data) {
      return [];
    }
    return unwrapData<{ groups?: AppSidebarSpace[] }>(response.data).groups ?? [];
  } catch {
    return [];
  }
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
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
