import type { AuditLogItem } from "@/lib/schema";

export type AdminAuditLogsViewProps = {
  createdFrom: string;
  createdTo: string;
  outcome: string;
  query: string;
  risk: string;
  rows: AuditLogItem[];
};

export type AdminAuditLogsErrorViewProps = {
  status?: number;
};
