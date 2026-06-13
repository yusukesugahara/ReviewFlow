import {
  getApplicationStatusBadgeVariant,
  getApplicationStatusLabel,
} from "@/components/applications/status/application-status";
import { APPLICATION_STATUSES } from "@/lib/constants/applications";

describe("application-status", () => {
  // テスト内容: ワークフロー状態に対応するバッジ種別が返ることを確認する
  it("returns badge variants for workflow statuses", () => {
    expect(getApplicationStatusBadgeVariant(APPLICATION_STATUSES.approved)).toBe(
      "default",
    );
    expect(getApplicationStatusBadgeVariant(APPLICATION_STATUSES.inReview)).toBe(
      "secondary",
    );
    expect(getApplicationStatusBadgeVariant(APPLICATION_STATUSES.returned)).toBe(
      "destructive",
    );
    expect(getApplicationStatusBadgeVariant(APPLICATION_STATUSES.rejected)).toBe(
      "destructive",
    );
    expect(getApplicationStatusBadgeVariant("draft")).toBe("outline");
  });

  // テスト内容: 既知ラベルを返し、未知の状態は保持されることを確認する
  it("returns known labels and preserves unknown statuses", () => {
    expect(getApplicationStatusLabel(APPLICATION_STATUSES.approved)).toBe("承認");
    expect(getApplicationStatusLabel("custom_status")).toBe("custom_status");
  });
});
