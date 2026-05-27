import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { ApplicationCapabilities } from "./application-capabilities";
import type { ApplicationFormField } from "./application-detail.types";
import { DynamicFieldsTable } from "./dynamic-fields";
import { renderFieldValue } from "@/lib/form-field-value";

type ReviewerApplicationActionsProps = {
  fields: ApplicationFormField[];
  values: Record<string, unknown>;
  capabilities: Pick<
    ApplicationCapabilities,
    "canApproveApplication" | "canRejectApplication" | "canReturnApplication"
  >;
  approveAction: (formData: FormData) => Promise<void>;
  rejectAction: (formData: FormData) => Promise<void>;
  returnAction: (formData: FormData) => Promise<void>;
};

export function ReviewerApplicationActions({
  fields,
  values,
  capabilities,
  approveAction,
  rejectAction,
  returnAction,
}: ReviewerApplicationActionsProps) {
  if (
    !capabilities.canApproveApplication &&
    !capabilities.canRejectApplication &&
    !capabilities.canReturnApplication
  ) {
    return null;
  }

  return (
    <>
      {capabilities.canApproveApplication || capabilities.canRejectApplication ? (
        <div className="grid gap-6 md:grid-cols-2">
          {capabilities.canApproveApplication ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-green-700">✓ 承認</CardTitle>
                <CardDescription>この申請を承認します</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={approveAction} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="approve-comment">コメント（任意）</Label>
                    <Textarea id="approve-comment" name="comment" placeholder="承認コメント" rows={3} />
                  </div>
                  <Button type="submit" className="w-full">承認する</Button>
                </form>
              </CardContent>
            </Card>
          ) : null}

          {capabilities.canRejectApplication ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-red-700">✕ 却下</CardTitle>
                <CardDescription>この申請を却下します</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={rejectAction} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reject-comment">コメント（任意）</Label>
                    <Textarea id="reject-comment" name="comment" placeholder="却下理由" rows={3} />
                  </div>
                  <Button type="submit" variant="destructive" className="w-full">却下する</Button>
                </form>
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}

      {capabilities.canReturnApplication ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-amber-700">↩ 差し戻し</CardTitle>
            <CardDescription>特定のフィールドに対して修正を依頼します</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={returnAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="overallComment">全体コメント（任意）</Label>
                <Textarea
                  id="overallComment"
                  name="overallComment"
                  placeholder="差し戻しの全体的な理由や説明"
                  rows={3}
                />
              </div>

              <DynamicFieldsTable
                fields={fields.map((field) => ({
                  ...field,
                  required: field.required ?? false,
                }))}
                values={values}
                title="差し戻し対象"
                renderValue={(field, value) => (
                  <div className="space-y-3">
                    {field.helpText ? (
                      <p className="text-xs leading-5 text-muted-foreground">
                        {field.helpText}
                      </p>
                    ) : null}
                    <div className="min-h-9 whitespace-pre-wrap border border-slate-300 bg-white px-3 py-2 text-sm leading-6 text-slate-900">
                      {renderFieldValue(field, value)}
                    </div>
                    <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        id={`return:${field.id}`}
                        name={`return:${field.id}`}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      このフォームを差し戻し対象にする
                    </label>
                    <Input
                      name={`comment:${field.id}`}
                      placeholder="このフォームへの差し戻しコメント（任意）"
                      className="bg-white text-sm"
                    />
                  </div>
                )}
              />

              <Button type="submit" variant="outline" className="w-full">
                差し戻す
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
