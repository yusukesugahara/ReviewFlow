import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { CardHeading } from "@/components/ui/card-heading";
import { userRoleLabel } from "@/lib/constants/role-labels";
import { formatDateTimeJa } from "@/lib/date-format";

type AdminInvitationSentCardProps = {
  email?: string;
  expiresAt?: string;
  role?: string;
};

export function AdminInvitationSentCard({
  email,
  expiresAt,
  role,
}: AdminInvitationSentCardProps) {
  return (
    <Card className="border-violet-200 bg-violet-50/40">
      <CardHeader>
        <CardHeading
          description="対象ユーザはメール内のリンクから招待を受諾できます"
          title="招待メールを送信しました"
        />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {role ? <Badge>{userRoleLabel(role)}</Badge> : null}
          {email ? <Badge variant="outline">{email}</Badge> : null}
        </div>
        {expiresAt ? (
          <p className="text-xs text-muted-foreground">
            有効期限: {formatDateTimeJa(expiresAt)}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
