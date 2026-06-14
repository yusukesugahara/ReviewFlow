import type { ReactNode } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { getCurrentSessionUser } from "@/app/(authorized)/session/actions";
import { getAdminLayoutSpaces } from "./actions";

export const dynamic = "force-dynamic";

type AdminLayoutProps = {
  children: ReactNode;
};

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const [spaces, me] = await Promise.all([
    getAdminLayoutSpaces(),
    getCurrentSessionUser(),
  ]);

  return (
    <AppSidebar
      spaces={spaces}
      userEmail={me?.email}
      userName={me?.name}
      userRoles={me?.roles ?? []}
    >
      {children}
    </AppSidebar>
  );
}
