import type { AuditLogItem } from "@/lib/schema";

const APPLICATION_CORRECTED = "application.corrected";
const APPLICATION_RESUBMITTED = "application.resubmitted";
const APPLICATION_RETURNED = "application.returned";

export type ApplicationResubmissionMessage = {
  id: string;
  createdAt: string;
  message: string;
};

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

/**
 * 再提出時に申請者が入力したメッセージを新しい順で取得します。
 */
export function getApplicationResubmissionMessages(
  logs: AuditLogItem[],
): ApplicationResubmissionMessage[] {
  return logs.flatMap((log) => {
    if (log.actionType !== APPLICATION_RESUBMITTED) {
      return [];
    }
    const message = readMetadataMessage(log.metadataJson);
    return message
      ? [{ id: log.id, createdAt: log.createdAt, message }]
      : [];
  });
}

function readMetadataFieldKeys(
  metadata: Record<string, unknown> | null | undefined,
): string[] {
  const fieldKeys = metadata?.fieldKeys;
  return Array.isArray(fieldKeys)
    ? fieldKeys.filter((key): key is string => typeof key === "string")
    : [];
}

function readMetadataMessage(
  metadata: Record<string, unknown> | null | undefined,
): string | null {
  const message = metadata?.message;
  return typeof message === "string" && message.trim() ? message.trim() : null;
}
