"use client";

import { useState } from "react";
import { Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type DescriptionEditModalProps = {
  action: (formData: FormData) => Promise<void>;
  initialDescription: string;
};

export function DescriptionEditModal({
  action,
  initialDescription,
}: DescriptionEditModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setIsOpen(true)}
              aria-label="説明欄を編集"
            >
              <Edit3 aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>説明欄を編集</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      {isOpen ? (
        <DialogContent
          titleId="description-edit-title"
          descriptionId="description-edit-description"
          onClose={() => setIsOpen(false)}
        >
          <DialogHeader>
            <DialogTitle id="description-edit-title">説明欄を編集</DialogTitle>
            <DialogDescription id="description-edit-description">
              利用者に表示するフォーム説明を更新します。
            </DialogDescription>
          </DialogHeader>
          <form action={action} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="form-description">説明</Label>
              <Textarea
                id="form-description"
                name="description"
                defaultValue={initialDescription}
                rows={8}
                placeholder="申請前に伝えたい内容を入力してください"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
              >
                キャンセル
              </Button>
              <Button type="submit">保存</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      ) : null}
    </>
  );
}
