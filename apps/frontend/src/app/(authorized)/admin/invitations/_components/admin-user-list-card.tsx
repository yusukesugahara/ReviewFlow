import { UserRoundPlus } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { TenantUserSummary } from "@/lib/schema";
import { AdminUserTable } from "./admin-user-table";

type AdminUserListCardProps = {
  currentUserId: string | null;
  onOpenInvitationDialog: () => void;
  userListError?: string;
  users: TenantUserSummary[];
};

export function AdminUserListCard({
  currentUserId,
  onOpenInvitationDialog,
  userListError,
  users,
}: AdminUserListCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>ユーザ一覧</CardTitle>
            <CardDescription>
              {users.length}名のユーザが登録されています
            </CardDescription>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="ユーザを招待"
                  onClick={onOpenInvitationDialog}
                >
                  <UserRoundPlus aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>ユーザを招待</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent>
        {userListError ? (
          <p className="text-sm font-medium text-red-700">
            {userListError}
          </p>
        ) : users.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            ユーザが見つかりません
          </p>
        ) : (
          <AdminUserTable currentUserId={currentUserId} users={users} />
        )}
      </CardContent>
    </Card>
  );
}
