import { formatDateJa } from "@/lib/date-format";
import type { SpaceUserTableMember } from "../_components/space-users-table";
import type { SpaceUsersMember } from "../types";

export function buildSpaceUserTableMembers(
  members: SpaceUsersMember[],
): SpaceUserTableMember[] {
  return members.map((member) => ({
    ...member,
    createdAtLabel: formatDateJa(member.createdAt),
  }));
}
