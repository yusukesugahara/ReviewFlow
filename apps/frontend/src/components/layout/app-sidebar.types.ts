export type AppSidebarSpace = {
  id: string;
  name: string;
  currentUserRole?: "admin" | "user" | null;
};

export type AppSidebarVariant = "workspace" | "applicant";
