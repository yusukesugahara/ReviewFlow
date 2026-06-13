import {
  ClipboardList,
  FilePlusCorner,
  Inbox,
  LayoutDashboard,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { SidebarSpacePath } from "@/components/layout/app-sidebar-routing";
import type { AppSidebarSpace, AppSidebarVariant } from "./app-sidebar.types";

export type SidebarNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  spaceAdminOnly?: boolean;
  spacePath?: SidebarSpacePath;
};

const workspaceSidebarNavItems: SidebarNavItem[] = [
  {
    href: "/space",
    label: "概要",
    icon: LayoutDashboard,
    spacePath: "overview",
  },
  {
    href: "/space/applications",
    label: "申請フォーム一覧",
    icon: ClipboardList,
    spacePath: "applications",
  },
  {
    href: "/space/submissions",
    label: "申請一覧",
    icon: Inbox,
    spacePath: "submissions",
  },
  {
    href: "/space/applications/new",
    label: "申請フォーム作成",
    icon: FilePlusCorner,
    spacePath: "applicationsNew",
  },
  { href: "/space/users", label: "メンバー", icon: Users, spaceAdminOnly: true },
];

const applicantSidebarNavItems: SidebarNavItem[] = [
  {
    href: "/space/applications",
    label: "申請フォーム一覧",
    icon: ClipboardList,
    spacePath: "applications",
  },
  {
    href: "/space/applications/new",
    label: "申請フォーム作成",
    icon: FilePlusCorner,
    spacePath: "applicationsNew",
  },
];

export const tenantAdminSidebarNavItems: SidebarNavItem[] = [
  { href: "/admin/spaces", label: "スペース", icon: ShieldCheck },
  { href: "/admin/invitations", label: "ユーザ", icon: Users },
  { href: "/admin/audit-logs", label: "監査ログ", icon: ClipboardList },
];

export function getPrimarySidebarNavItems({
  activeSpace,
  isTenantAdmin,
  variant,
}: {
  activeSpace?: AppSidebarSpace;
  isTenantAdmin: boolean;
  variant: AppSidebarVariant;
}): SidebarNavItem[] {
  const canManageActiveSpace = canManageSidebarSpace({
    activeSpace,
    isTenantAdmin,
  });
  const items =
    variant === "workspace" ? workspaceSidebarNavItems : applicantSidebarNavItems;

  return items
    .filter((item) => !item.adminOnly || isTenantAdmin)
    .filter((item) => !item.spaceAdminOnly || canManageActiveSpace);
}

export function canManageSidebarSpace({
  activeSpace,
  isTenantAdmin,
}: {
  activeSpace?: Pick<AppSidebarSpace, "currentUserRole">;
  isTenantAdmin: boolean;
}): boolean {
  return isTenantAdmin || activeSpace?.currentUserRole === "admin";
}
