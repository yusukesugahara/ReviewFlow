import type { CurrentSessionUser } from "@/app/(authorized)/session/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateAccountProfileAction } from "../actions";

type AccountProfileFormProps = {
  error?: string;
  user: CurrentSessionUser;
};

export function AccountProfileForm({ error, user }: AccountProfileFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>プロフィール</CardTitle>
        <CardDescription>表示名とログインに使うメールアドレス</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={updateAccountProfileAction} className="space-y-4">
          {error ? <Alert variant="destructive">{error}</Alert> : null}
          <div className="space-y-2">
            <Label htmlFor="account-name">名前</Label>
            <Input
              id="account-name"
              name="name"
              autoComplete="name"
              defaultValue={user.name ?? ""}
              placeholder="名前"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="account-email">メールアドレス</Label>
            <Input
              id="account-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              defaultValue={user.email}
            />
          </div>
          <Button type="submit">プロフィールを保存</Button>
        </form>
      </CardContent>
    </Card>
  );
}
