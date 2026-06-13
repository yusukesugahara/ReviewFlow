import type { AuditLogItem } from "@/lib/schema";

export type AdminAuditLogsViewProps = {
  createdFrom: string;
  createdTo: string;
  query: string;
  targetType: string;
  rows: AuditLogItem[];
};

export type AdminAuditLogsErrorViewProps = {
  status?: number;
};
