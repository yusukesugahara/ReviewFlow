import { formatDateJa } from "@/lib/date-format";
import type { SpaceUserTableMember } from "../_components/space-users-table";
import type { SpaceUsersMember } from "../types";

/**
 * スペースメンバーをテーブル表示用の日時ラベル付きデータに変換します。
 */
export function buildSpaceUserTableMembers(
  members: SpaceUsersMember[],
): SpaceUserTableMember[] {
  return members.map((member) => ({
    ...member,
    createdAtLabel: formatDateJa(member.createdAt),
  }));
}
