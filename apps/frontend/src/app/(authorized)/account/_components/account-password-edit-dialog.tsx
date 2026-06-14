import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { updateAccountPasswordAction } from "../actions";

type AccountPasswordEditDialogProps = {
  error?: string;
  onClose: () => void;
};

export function AccountPasswordEditDialog({
  error,
  onClose,
}: AccountPasswordEditDialogProps) {
  return (
    <DialogContent
      titleId="account-password-edit-title"
      descriptionId="account-password-edit-description"
      onClose={onClose}
    >
      <DialogHeader>
        <DialogTitle id="account-password-edit-title">
          パスワードを変更
        </DialogTitle>
        <DialogDescription id="account-password-edit-description">
          現在のパスワードを確認して変更します。
        </DialogDescription>
      </DialogHeader>
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
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            キャンセル
          </Button>
          <Button type="submit">変更</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
