import type { AuditLogItem } from "@/lib/schema";

export type AdminAuditLogsViewProps = {
  createdFrom: string;
  createdTo: string;
  pagination: AdminAuditLogsPagination;
  query: string;
  targetType: string;
  rows: AuditLogItem[];
};

export type AdminAuditLogsPagination = {
  currentPage: number;
  limit: number;
  offset: number;
  total: number;
  totalPages: number;
};

export type AdminAuditLogsErrorViewProps = {
  status?: number;
};
