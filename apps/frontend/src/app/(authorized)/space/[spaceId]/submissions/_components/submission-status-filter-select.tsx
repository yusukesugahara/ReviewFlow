"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SubmissionStatusFilterSelectProps = {
  defaultValue: string;
  options: Array<{ label: string; value: string }>;
};

/**
 * 提出一覧のステータスフィルター入力を表示します。
 */
export function SubmissionStatusFilterSelect({
  defaultValue,
  options,
}: SubmissionStatusFilterSelectProps) {
  const [value, setValue] = useState(defaultValue);

  return (
    <>
      <input type="hidden" name="status" value={value} />
      <Select
        value={value || "all"}
        onValueChange={(nextValue) => setValue(nextValue === "all" ? "" : nextValue)}
      >
        <SelectTrigger id="status" className="bg-white">
          <SelectValue placeholder="すべて" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">すべて</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}
