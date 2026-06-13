import { Card, CardContent } from "@/components/ui/card";

export function ApplicationDetailErrorView({ status }: { status?: number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-destructive">
          {status
            ? `申請詳細の取得に失敗しました（status: ${status}）`
            : "申請詳細の取得に失敗しました"}
        </p>
      </CardContent>
    </Card>
  );
}
