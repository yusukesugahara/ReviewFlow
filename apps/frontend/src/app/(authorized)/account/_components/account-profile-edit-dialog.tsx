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
import { updateAccountProfileAction } from "../actions";

type AccountProfileEditDialogProps = {
  error?: string;
  onClose: () => void;
  user: CurrentSessionUser;
};

/**
 * プロフィール編集ダイアログを表示します。
 */
export function AccountProfileEditDialog({
  error,
  onClose,
  user,
}: AccountProfileEditDialogProps) {
  return (
    <DialogContent
      titleId="account-profile-edit-title"
      descriptionId="account-profile-edit-description"
      onClose={onClose}
    >
      <DialogHeader>
        <DialogTitle id="account-profile-edit-title">
          プロフィールを編集
        </DialogTitle>
        <DialogDescription id="account-profile-edit-description">
          名前を変更します。
        </DialogDescription>
      </DialogHeader>
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
