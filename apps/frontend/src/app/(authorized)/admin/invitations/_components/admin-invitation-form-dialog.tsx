import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

type AdminInvitationFormDialogProps = {
  formError?: string;
  onClose: () => void;
};

export function AdminInvitationFormDialog({
  formError,
  onClose,
}: AdminInvitationFormDialogProps) {
  return (
    <DialogContent
      titleId="admin-invitation-form-title"
      descriptionId="admin-invitation-form-description"
      onClose={onClose}
    >
      <DialogHeader>
        <DialogTitle id="admin-invitation-form-title">
          新しい招待を送信
        </DialogTitle>
        <DialogDescription id="admin-invitation-form-description">
          メールアドレスとロールを指定して招待メールを送信します
        </DialogDescription>
      </DialogHeader>
      {formError ? (
        <p className="text-sm font-medium text-red-700">
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
    </DialogContent>
  );
}
