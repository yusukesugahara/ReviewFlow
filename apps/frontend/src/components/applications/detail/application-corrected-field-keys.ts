import type { AuditLogItem } from "@/lib/schema";

const APPLICATION_CORRECTED = "application.corrected";
const APPLICATION_RESUBMITTED = "application.resubmitted";
const APPLICATION_RETURNED = "application.returned";

/**
 * 最新の差し戻し修正サイクルで保存された fieldKey 一覧を取得します。
 */
export function getLatestCorrectionCycleFieldKeys(
  logs: AuditLogItem[],
): string[] {
  const keys = new Set<string>();
  let readingLatestCycle = false;

  for (const log of logs) {
    if (!readingLatestCycle) {
      if (log.actionType === APPLICATION_RETURNED) {
        break;
      }
      if (log.actionType === APPLICATION_RESUBMITTED) {
        readingLatestCycle = true;
        continue;
      }
      if (log.actionType === APPLICATION_CORRECTED) {
        readingLatestCycle = true;
      } else {
        continue;
      }
    }

    if (log.actionType === APPLICATION_RETURNED) {
      break;
    }
    if (log.actionType !== APPLICATION_CORRECTED) {
      continue;
    }

    for (const key of readMetadataFieldKeys(log.metadataJson)) {
      keys.add(key);
    }
  }

  return [...keys];
}

function readMetadataFieldKeys(
  metadata: Record<string, unknown> | null | undefined,
): string[] {
  const fieldKeys = metadata?.fieldKeys;
  return Array.isArray(fieldKeys)
    ? fieldKeys.filter((key): key is string => typeof key === "string")
    : [];
}
