import type { CurrentSessionUser } from "@/app/(authorized)/session/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateAccountEmailAction } from "../actions";

type AccountEmailEditDialogProps = {
  error?: string;
  onClose: () => void;
  user: CurrentSessionUser;
};

export function AccountEmailEditDialog({
  error,
  onClose,
  user,
}: AccountEmailEditDialogProps) {
  return (
    <DialogContent
      titleId="account-email-edit-title"
      descriptionId="account-email-edit-description"
      onClose={onClose}
    >
      <DialogHeader>
        <DialogTitle id="account-email-edit-title">
          メールアドレスを編集
        </DialogTitle>
        <DialogDescription id="account-email-edit-description">
          ログインに使うメールアドレスを変更します。
        </DialogDescription>
      </DialogHeader>
      <form action={updateAccountEmailAction} className="space-y-4">
        {error ? <Alert variant="destructive">{error}</Alert> : null}
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
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            キャンセル
          </Button>
          <Button type="submit">保存</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
