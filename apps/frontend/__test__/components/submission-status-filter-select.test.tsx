import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SubmissionStatusFilterSelect } from "@/app/(authorized)/space/[spaceId]/submissions/_components/submission-status-filter-select";

describe("SubmissionStatusFilterSelect", () => {
  // テスト内容: 選択したステータスとhidden inputが同期することを確認する
  it("keeps the hidden input in sync with the selected status", async () => {
    const user = userEvent.setup();
    render(
      <SubmissionStatusFilterSelect
        defaultValue=""
        options={[{ label: "提出済み", value: "submitted" }]}
      />,
    );

    const hidden = document.querySelector('input[name="status"]');
    expect(hidden).toHaveValue("");

    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: "提出済み" }));

    expect(hidden).toHaveValue("submitted");

    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: "すべて" }));

    expect(hidden).toHaveValue("");
  });
});
