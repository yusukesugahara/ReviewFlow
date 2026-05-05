import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { ApplicationCapabilities } from "../model/application-capabilities";
import type { ApplicationFormField } from "./application-detail-view";

type ReviewerApplicationActionsProps = {
  fields: ApplicationFormField[];
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

              <div className="space-y-2">
                <Label>差し戻し対象フィールド</Label>
                <div className="space-y-3">
                  {fields.map((field) => (
                    <div key={field.id} className="space-y-2 rounded-lg border p-3">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`return:${field.id}`}
                          name={`return:${field.id}`}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <Label htmlFor={`return:${field.id}`} className="cursor-pointer font-medium">
                          {field.label}
                          <span className="ml-2 font-mono text-xs text-muted-foreground">
                            ({field.fieldKey})
                          </span>
                        </Label>
                      </div>
                      <Input
                        name={`comment:${field.id}`}
                        placeholder="この項目への個別コメント（任意）"
                        className="text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>

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
