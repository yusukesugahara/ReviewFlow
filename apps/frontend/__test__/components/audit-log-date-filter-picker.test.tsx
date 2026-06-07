import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuditLogDateFilterPicker } from "@/app/(authorized)/admin/audit-logs/audit-log-date-filter-picker";

describe("AuditLogDateFilterPicker", () => {
  // テスト内容: 初期日付を整形表示し、クリアできることを確認する
  it("renders a formatted initial value and clears it", async () => {
    const user = userEvent.setup();
    render(
      <AuditLogDateFilterPicker
        defaultValue="2026-06-06"
        id="createdFrom"
        name="createdFrom"
      />,
    );

    expect(screen.getByText("2026/06/06")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2026-06-06")).toHaveAttribute("name", "createdFrom");

    await user.click(screen.getByRole("button", { name: "日付をクリア" }));

    expect(screen.getByText("日付を選択")).toBeInTheDocument();
    expect(screen.getByDisplayValue("")).toHaveAttribute("name", "createdFrom");
  });

  // テスト内容: カレンダーポップオーバーを開閉できることを確認する
  it("toggles the calendar popover", async () => {
    const user = userEvent.setup();
    render(
      <AuditLogDateFilterPicker
        defaultValue=""
        id="createdTo"
        name="createdTo"
      />,
    );

    const trigger = screen.getByRole("button", { name: /日付を選択/ });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await user.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });
});
