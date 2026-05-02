export type ApplicationStatusBadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline";

export function getApplicationStatusBadgeVariant(
  status: string,
): ApplicationStatusBadgeVariant {
  switch (status) {
    case "approved":
      return "default";
    case "in_review":
      return "secondary";
    case "returned":
    case "rejected":
      return "destructive";
    default:
      return "outline";
  }
}

export function getApplicationStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: "下書き",
    submitted: "提出済み",
    in_review: "レビュー中",
    returned: "差し戻し",
    approved: "承認",
    rejected: "却下",
  };
  return labels[status] ?? status;
}
