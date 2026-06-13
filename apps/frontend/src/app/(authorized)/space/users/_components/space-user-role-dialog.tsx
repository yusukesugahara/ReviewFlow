import { useId } from "react";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SPACE_ROLE_OPTIONS } from "@/lib/constants/roles";
import type { SpaceUserTableMember } from "./space-users-table";

type SpaceUserRoleDialogProps = {
  action: (formData: FormData) => Promise<void>;
  onClose: () => void;
  target: SpaceUserTableMember;
};

export function SpaceUserRoleDialog({
  action,
  onClose,
  target,
}: SpaceUserRoleDialogProps) {
  const titleId = useId();
  const descriptionId = useId();

  return (
    <DialogContent
      titleId={titleId}
      descriptionId={descriptionId}
      className="max-w-md"
      onClose={onClose}
    >
      <form action={action} className="space-y-5">
        <DialogHeader>
          <DialogTitle id={titleId}>スペースロールを変更</DialogTitle>
          <DialogDescription id={descriptionId}>
            {target.email} のスペースロールを変更します。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="space-role">スペースロール</Label>
          <Select name="role" defaultValue={target.role}>
            <SelectTrigger id="space-role" className="h-10 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SPACE_ROLE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
