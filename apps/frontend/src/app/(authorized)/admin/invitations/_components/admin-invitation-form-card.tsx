import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TENANT_ROLE_OPTIONS, TENANT_ROLES } from "@/lib/constants/roles";
import { createInvitationAction } from "../actions";

type AdminInvitationFormCardProps = {
  formError?: string;
};

export function AdminInvitationFormCard({ formError }: AdminInvitationFormCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>新しい招待を送信</CardTitle>
        <CardDescription>
          メールアドレスとロールを指定して招待メールを送信します
        </CardDescription>
      </CardHeader>
      <CardContent>
        {formError ? (
          <p className="mb-4 text-sm font-medium text-red-700">
            {formError}
          </p>
        ) : null}
        <form action={createInvitationAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">メールアドレス</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              placeholder="member@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">ロール</Label>
            <Select name="role" defaultValue={TENANT_ROLES.user}>
              <SelectTrigger id="role" className="h-10 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TENANT_ROLE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit">招待メールを送信</Button>
        </form>
      </CardContent>
    </Card>
  );
}
