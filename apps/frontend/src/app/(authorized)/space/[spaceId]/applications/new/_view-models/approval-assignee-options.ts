import type { ApprovalAssigneeOption } from "@/components/application-setup/form-builder/application-setup-draft-form";
import type { SpaceNewApplicationMember } from "../types";

/**
 * スペースメンバーを承認担当者の選択肢に変換します。
 */
export function toApprovalAssigneeOptions(
  members: SpaceNewApplicationMember[],
): ApprovalAssigneeOption[] {
  return members.map((member) => ({
    id: member.userId,
    label: member.name ? `${member.name} (${member.email})` : member.email,
  }));
}
