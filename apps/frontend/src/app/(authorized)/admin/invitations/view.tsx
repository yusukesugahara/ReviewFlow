"use client";

import { useState } from "react";
import { AdminInvitationFormDialog } from "./_components/admin-invitation-form-dialog";
import { AdminInvitationErrorCard } from "./_components/admin-invitation-error-card";
import { AdminInvitationSentCard } from "./_components/admin-invitation-sent-card";
import { AdminUserListCard } from "./_components/admin-user-list-card";
import type { AdminInvitationsViewProps } from "./types";

/**
 * 管理者向け招待管理画面を表示します。
 */
export function AdminInvitationsView({
  sent,
  email,
  role,
  expiresAt,
  error,
  formError,
  currentUserId,
  userListError,
  users,
}: AdminInvitationsViewProps) {
  const isInvitationSent = sent === "1";
  const [isInvitationDialogOpen, setIsInvitationDialogOpen] = useState(
    Boolean(formError),
  );

  return (
    <div className="space-y-6">
      {error ? (
        <AdminInvitationErrorCard error={error} />
      ) : null}

      {isInvitationSent ? (
        <AdminInvitationSentCard email={email} expiresAt={expiresAt} role={role} />
      ) : null}

      <AdminUserListCard
        currentUserId={currentUserId}
        onOpenInvitationDialog={() => setIsInvitationDialogOpen(true)}
        userListError={userListError}
        users={users}
      />

      {isInvitationDialogOpen ? (
        <AdminInvitationFormDialog
          formError={formError}
          onClose={() => setIsInvitationDialogOpen(false)}
        />
      ) : null}
    </div>
  );
}
