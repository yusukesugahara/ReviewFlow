import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { CardHeading } from "@/components/ui/card-heading";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { renderFieldValue } from "@/lib/form-field-value";
import { DynamicFieldsTable } from "../dynamic-fields/dynamic-fields";
import { ReturnApplicationConfirmButton } from "../actions/return-application-confirm-button";
import { ReturnApplicationFieldInput } from "../actions/return-application-field-input";
import type {
  ApplicationCorrectionTargetItem,
  ApplicationDetailViewModel,
  ApplicationFormField,
} from "./application-detail.types";

type ApplicationFieldsCardProps = {
  application: ApplicationDetailViewModel;
  canReturnApplication: boolean;
  decisionActions?: ReactNode;
  description: string;
  fields: ApplicationFormField[];
  openCorrectionItems: ApplicationCorrectionTargetItem[];
  returnAction?: (formData: FormData) => Promise<void>;
  title: string;
};

/**
 * 申請詳細の入力項目カードを表示します。
 */
export function ApplicationFieldsCard({
  application,
  fields,
  title,
  description,
  openCorrectionItems,
  canReturnApplication,
  returnAction,
  decisionActions,
}: ApplicationFieldsCardProps) {
  const correctionTargetKeys = new Set(
    openCorrectionItems.flatMap((item) => [item.formFieldId, item.fieldKey]),
  );
  const canReturn = canReturnApplication && !!returnAction;
  const returnFormId = `return-application-${application.id}`;
  const table = (
    <DynamicFieldsTable
      fields={fields.map((field) => ({
        ...field,
        required: field.required ?? false,
      }))}
      values={application.values}
      title="申請書"
      getRowClassName={(field) =>
        correctionTargetKeys.has(field.id) || correctionTargetKeys.has(field.fieldKey)
          ? "bg-amber-50"
          : undefined
      }
      renderValue={(field, value) => {
        const isCorrectionTarget =
          correctionTargetKeys.has(field.id) || correctionTargetKeys.has(field.fieldKey);
        return (
          <div className="space-y-3">
            <p className="whitespace-pre-wrap break-words text-sm font-medium leading-6 text-slate-950">
              {renderFieldValue(field, value)}
            </p>
            {isCorrectionTarget ? (
              <p className="text-xs font-medium text-amber-700">
                差し戻し対象項目です
              </p>
            ) : null}
            {canReturn ? <ReturnApplicationFieldInput field={field} /> : null}
          </div>
        );
      }}
    />
  );

  return (
    <Card>
      <CardHeader className="border-b border-slate-200">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <CardHeading
            description={description}
            title={title}
          />
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {canReturn && returnAction ? (
          <div className="space-y-4">
            <form id={returnFormId} action={returnAction} className="space-y-4">
              {application.currentStepOrder ? (
                <input
                  type="hidden"
                  name="expectedStepOrder"
                  value={application.currentStepOrder}
                />
              ) : null}
              <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                <Label htmlFor="overallComment">差し戻し全体コメント（任意）</Label>
                <Textarea
                  id="overallComment"
                  name="overallComment"
                  placeholder="差し戻しの全体的な理由や説明"
                  rows={3}
                  className="bg-white"
                />
              </div>
              {table}
            </form>
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 pt-4">
              <ReturnApplicationConfirmButton formId={returnFormId} />
              {decisionActions}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {table}
            {decisionActions ? (
              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 pt-4">
                {decisionActions}
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
