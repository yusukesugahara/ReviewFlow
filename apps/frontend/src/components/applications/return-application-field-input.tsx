import { Input } from "@/components/ui/input";
import type { DynamicFormField } from "./dynamic-fields.types";

type ReturnApplicationFieldInputProps = {
  field: Pick<DynamicFormField, "id">;
};

export function ReturnApplicationFieldInput({
  field,
}: ReturnApplicationFieldInputProps) {
  return (
    <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50/60 p-3">
      <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-800">
        <input
          type="checkbox"
          id={`return:${field.id}`}
          name={`return:${field.id}`}
          className="h-4 w-4 rounded border-gray-300"
        />
        この項目を差し戻し対象にする
      </label>
      <Input
        name={`comment:${field.id}`}
        placeholder="この項目への差し戻しコメント（任意）"
        className="bg-white text-sm"
      />
    </div>
  );
}
