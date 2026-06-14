import type { ReactNode } from "react";
import { getCurrentSessionUser } from "@/app/(authorized)/session/actions";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { getSpaceLayoutSpaces } from "../space/actions";

export const dynamic = "force-dynamic";

type AccountLayoutProps = {
  children: ReactNode;
};

export default async function AccountLayout({ children }: AccountLayoutProps) {
  const [spaces, me] = await Promise.all([
    getSpaceLayoutSpaces(),
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
