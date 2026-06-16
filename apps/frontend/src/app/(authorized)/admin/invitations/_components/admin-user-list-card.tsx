import { UserRoundPlus } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { CardHeading } from "@/components/ui/card-heading";
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

/**
 * テナントユーザー一覧カードを表示します。
 */
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
          <CardHeading
            description="テナントに登録されているユーザを管理します"
            title="ユーザ一覧"
          />
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
