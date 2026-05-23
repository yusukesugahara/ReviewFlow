import type { AuditLogItem } from "@/lib/schema";

export type AdminAuditLogsViewProps = {
  rows: AuditLogItem[];
};

export type AdminAuditLogsErrorViewProps = {
  status?: number;
};
