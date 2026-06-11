import { Card, CardContent } from "@/components/ui/card";

type AdminInvitationErrorCardProps = {
  error: string;
};

export function AdminInvitationErrorCard({ error }: AdminInvitationErrorCardProps) {
  return (
    <Card className="border-red-200 bg-red-50/40">
      <CardContent className="pt-6">
        <p className="text-sm font-medium text-red-700">{error}</p>
      </CardContent>
    </Card>
  );
}
