import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SPACE_ROLE_OPTIONS, SPACE_ROLES } from "@/lib/constants/roles";
import { formatDateJa } from "@/lib/date-format";
import { addSpaceMemberAction } from "./actions";
import { SpaceUsersTable } from "./space-users-table";
import type { SpaceUsersErrorViewProps, SpaceUsersViewProps } from "./types";

export function SpaceUsersView({
  availableUsers,
  currentUserId,
  error,
  formError,
  isTenantAdmin,
  members,
  spaceId,
}: SpaceUsersViewProps) {
  return (
    <div className="space-y-6">
      {error ? <SpaceUsersMessage message={error} /> : null}
      {formError ? <SpaceUsersMessage message={formError} /> : null}

      {isTenantAdmin ? (
        <Card>
          <CardHeader>
            <CardTitle>ユーザーをスペースに追加</CardTitle>
            <CardDescription>
              同一テナント内の既存ユーザーを選択して、このスペースへ追加します
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              action={addSpaceMemberAction.bind(null, spaceId)}
              className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px_auto]"
            >
              <Select
                name="userId"
                required
                disabled={availableUsers.length === 0}
              >
                <SelectTrigger className="h-10 bg-background">
                  <SelectValue placeholder="追加するユーザーを選択" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name ?? user.email} / {user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                name="role"
                defaultValue={SPACE_ROLES.user}
                disabled={availableUsers.length === 0}
              >
                <SelectTrigger className="h-10 bg-background">
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
              <Button type="submit" disabled={availableUsers.length === 0}>
                追加
              </Button>
            </form>
            {availableUsers.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                追加できるユーザーはいません。
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>スペースユーザー一覧</CardTitle>
          <CardDescription>
            {members.length}名のユーザーが参加しています
          </CardDescription>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              ユーザーが見つかりません
            </p>
          ) : (
            <SpaceUsersTable
              currentUserId={currentUserId}
              members={members.map((member) => ({
                ...member,
                createdAtLabel: formatDateJa(member.createdAt),
              }))}
              spaceId={spaceId}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function SpaceUsersErrorView({ status }: SpaceUsersErrorViewProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-destructive">
          ユーザー一覧の取得に失敗しました
          {status ? `（status: ${status}）` : ""}
        </p>
      </CardContent>
    </Card>
  );
}

function SpaceUsersMessage({ message }: { message: string }) {
  return (
    <Card className="border-rose-200 bg-rose-50">
      <CardContent className="pt-6">
        <p className="text-sm font-medium text-rose-700">{message}</p>
      </CardContent>
    </Card>
  );
}
