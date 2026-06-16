import type { ApprovalAssigneeOption } from "@/components/application-setup/form-builder/application-setup-draft-form";
import type { SpaceNewApplicationMember } from "../types";

export function toApprovalAssigneeOptions(
  members: SpaceNewApplicationMember[],
): ApprovalAssigneeOption[] {
  return members.map((member) => ({
    id: member.userId,
    label: member.name ? `${member.name} (${member.email})` : member.email,
  }));
}
