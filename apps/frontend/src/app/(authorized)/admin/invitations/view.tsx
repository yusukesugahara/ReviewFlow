"use client";

import { AdminInvitationFormCard } from "./_components/admin-invitation-form-card";
import { AdminInvitationErrorCard } from "./_components/admin-invitation-error-card";
import { AdminInvitationSentCard } from "./_components/admin-invitation-sent-card";
import { AdminUserListCard } from "./_components/admin-user-list-card";
import type { AdminInvitationsViewProps } from "./types";

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

  return (
    <div className="space-y-6">
      <AdminInvitationFormCard formError={formError} />

      {error ? (
        <AdminInvitationErrorCard error={error} />
      ) : null}

      {isInvitationSent ? (
        <AdminInvitationSentCard email={email} expiresAt={expiresAt} role={role} />
      ) : null}

      <AdminUserListCard
        currentUserId={currentUserId}
        userListError={userListError}
        users={users}
      />
    </div>
  );
}
