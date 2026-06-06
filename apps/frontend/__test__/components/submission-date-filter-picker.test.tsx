import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SubmissionDateFilterPicker } from "@/app/(authorized)/space/[spaceId]/submissions/_components/submission-date-filter-picker";

describe("SubmissionDateFilterPicker", () => {
  // テスト内容: 整形済みの日付表示とクリア操作を確認する
  it("renders a formatted date value and clears it", async () => {
    const user = userEvent.setup();
    render(
      <SubmissionDateFilterPicker
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

  // テスト内容: カレンダーポップオーバーが開くことを確認する
  it("opens the calendar popover", async () => {
    const user = userEvent.setup();
    render(<SubmissionDateFilterPicker defaultValue="" id="createdTo" name="createdTo" />);

    const trigger = screen.getByRole("button", { name: /日付を選択/ });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await user.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });
});
