import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { CardHeading } from "@/components/ui/card-heading";
import { Badge } from "@/components/ui/badge";
import {
  formatCorrectionSubmittedValue,
  getCorrectionItemLabel,
} from "./application-corrections.helpers";
import { formatApplicationDateTime } from "../detail/application-detail-section-helpers";
import type {
  ApplicationCorrection,
  ApplicationCorrectionTargetItem,
  ApplicationFormField,
} from "../detail/application-detail.types";

export function OpenCorrectionSummary({
  items,
}: {
  items: ApplicationCorrectionTargetItem[];
}) {
  return (
    <Card>
      <CardHeader className="border-b border-slate-200">
        <CardHeading
          description="フィールドが差し戻し対象となっています"
          title="現在オープン中の修正対象"
        />
      </CardHeader>
      <CardContent className="pt-6">
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={`${item.formFieldId}-${item.fieldKey}`}
              className="flex items-center gap-2 border-l-2 border-amber-400 p-2 pl-3"
            >
              <Badge variant="outline">{item.label}</Badge>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function CorrectionHistory({
  corrections,
  fields,
  values,
}: {
  corrections: ApplicationCorrection[];
  fields: ApplicationFormField[];
  values: Record<string, unknown>;
}) {
  return (
    <Card>
      <CardHeader className="border-b border-slate-200">
        <CardHeading
          description={
            corrections.length === 0
              ? "差し戻し履歴はありません"
              : "差し戻しの内容と日時を確認できます"
          }
          title="差し戻し履歴"
        />
      </CardHeader>
      <CardContent className="pt-6">
        {corrections.length === 0 ? (
          <p className="py-4 text-center text-muted-foreground">
            差し戻し履歴はありません
          </p>
        ) : (
          <div className="space-y-4">
            {corrections.map((correction) => (
              <div
                key={correction.id}
                className="space-y-3 rounded-lg border p-4"
              >
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{correction.status}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {formatApplicationDateTime(correction.createdAt)}
                  </span>
                </div>
                {correction.overallComment ? (
                  <div className="rounded-md bg-muted/50 p-3">
                    <p className="mb-1 text-sm font-medium">総合コメント</p>
                    <p className="text-sm">{correction.overallComment}</p>
                  </div>
                ) : null}
                {correction.items.length > 0 ? (
                  <div>
                    <p className="mb-2 text-sm font-medium">個別コメント</p>
                    <ul className="space-y-1">
                      {correction.items.map((item) => (
                        <CorrectionHistoryItem
                          key={`${correction.id}-${item.fieldKey}`}
                          fields={fields}
                          item={item}
                          values={values}
                        />
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CorrectionHistoryItem({
  fields,
  item,
  values,
}: {
  fields: ApplicationFormField[];
  item: ApplicationCorrection["items"][number];
  values: Record<string, unknown>;
}) {
  const label = getCorrectionItemLabel(item, fields);
  const submittedValue = formatCorrectionSubmittedValue({ fields, item, values });

  return (
    <li className="space-y-2 border-l-2 border-amber-400 pl-4 text-sm">
      <p>
        <span className="font-medium text-slate-900">{label}:</span>{" "}
        {item.comment || "（コメントなし）"}
      </p>
      <div className="rounded-md bg-slate-50 px-3 py-2">
        <p className="text-xs font-medium text-slate-500">申請内容</p>
        <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-900">
          {submittedValue}
        </p>
      </div>
    </li>
  );
}
