"use client";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  FIELD_TYPE_OPTIONS,
  fieldTypeNeedsOptions,
  fieldTypeStoresValue,
  fieldTypeSupportsPlaceholder,
  type FieldType,
} from "@/lib/constants/form-fields";
import type { DraftField } from "./application-setup-fields";

type ApplicationSetupFieldContentModalProps = {
  field: DraftField;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  updateField: (id: string, patch: Partial<DraftField>) => void;
};

export function ApplicationSetupFieldContentModal({
  field,
  onOpenChange,
  open,
  updateField,
}: ApplicationSetupFieldContentModalProps) {
  if (!open) {
    return null;
  }

  return (
    <DialogContent
      titleId="field-content-modal-title"
      onClose={() => onOpenChange(false)}
      className="max-h-[90vh] max-w-2xl overflow-y-auto"
    >
      <DialogHeader>
        <DialogTitle id="field-content-modal-title">
          フォーム項目を編集
        </DialogTitle>
        <DialogDescription>
          選択中の項目に表示する内容をまとめて入力します。
        </DialogDescription>
      </DialogHeader>

      <div className="mt-5 space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`modal-label-${field.id}`}>項目名</Label>
            <Input
              id={`modal-label-${field.id}`}
              value={field.label}
              onChange={(event) => updateField(field.id, { label: event.target.value })}
              placeholder="例: 申請理由"
              className="bg-white"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`modal-type-${field.id}`}>入力形式</Label>
            <Select
              value={field.fieldType}
              onValueChange={(value) => {
                const nextFieldType = value as FieldType;
                updateField(field.id, {
                  fieldType: nextFieldType,
                  required: fieldTypeStoresValue(nextFieldType) ? field.required : false,
                });
              }}
            >
              <SelectTrigger id={`modal-type-${field.id}`} className="bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPE_OPTIONS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {fieldTypeStoresValue(field.fieldType) ? (
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={field.required}
              onChange={(event) => updateField(field.id, { required: event.target.checked })}
              className="h-4 w-4 rounded border-gray-300"
            />
            必須項目
          </label>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor={`modal-help-${field.id}`}>説明文</Label>
          <Textarea
            id={`modal-help-${field.id}`}
            value={field.helpText}
            onChange={(event) => updateField(field.id, { helpText: event.target.value })}
            rows={3}
            placeholder="例: 申請理由を具体的に記入してください"
            className="bg-white"
          />
        </div>

        {fieldTypeSupportsPlaceholder(field.fieldType) ? (
          <div className="space-y-2">
            <Label htmlFor={`modal-placeholder-${field.id}`}>入力例</Label>
            <Input
              id={`modal-placeholder-${field.id}`}
              value={field.placeholder}
              onChange={(event) => updateField(field.id, { placeholder: event.target.value })}
              placeholder="例: 交通費精算"
              className="bg-white"
            />
          </div>
        ) : null}

        {fieldTypeNeedsOptions(field.fieldType) ? (
          <div className="space-y-2">
            <Label htmlFor={`modal-options-${field.id}`}>選択肢</Label>
            <Textarea
              id={`modal-options-${field.id}`}
              value={field.optionsText}
              onChange={(event) => updateField(field.id, { optionsText: event.target.value })}
              rows={6}
              placeholder={"選択肢を1行ずつ入力\n例: 承認する\n差し戻す\n却下する"}
              className="bg-white"
            />
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            反映して閉じる
          </Button>
        </DialogFooter>
      </div>
    </DialogContent>
  );
}
