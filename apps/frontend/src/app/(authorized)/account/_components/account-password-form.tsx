import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { updateAccountPasswordAction } from "../actions";

type AccountPasswordFormProps = {
  error?: string;
};

export function AccountPasswordForm({ error }: AccountPasswordFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>パスワード</CardTitle>
        <CardDescription>現在のパスワードを確認して変更します</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={updateAccountPasswordAction} className="space-y-4">
          {error ? <Alert variant="destructive">{error}</Alert> : null}
          <div className="space-y-2">
            <Label htmlFor="current-password">現在のパスワード</Label>
            <PasswordInput
              id="current-password"
              name="currentPassword"
              autoComplete="current-password"
              minLength={8}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">新しいパスワード</Label>
            <PasswordInput
              id="new-password"
              name="newPassword"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password-confirmation">
              新しいパスワード（確認）
            </Label>
            <PasswordInput
              id="new-password-confirmation"
              name="newPasswordConfirmation"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          <Button type="submit">パスワードを変更</Button>
        </form>
      </CardContent>
    </Card>
  );
}
