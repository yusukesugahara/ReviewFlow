import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CopyButton as SpaceCopyButton } from "@/app/(authorized)/space/_components/copy-button";
import { CopyButton as AdminCopyButton } from "@/app/(authorized)/admin/_components/copy-button";

describe("CopyButton", () => {
  // テスト内容: スペース用コピーボタンが値をコピーすることを確認する
  it("copies values from the space copy button", async () => {
    const user = userEvent.setup();
    render(<SpaceCopyButton value="https://example.com/space" />);

    await user.click(screen.getByRole("button", { name: "URLをコピー" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "コピー済み" })).toBeInTheDocument();
    });
  });

  // テスト内容: 管理者用コピーボタンが値をコピーすることを確認する
  it("copies values from the admin copy button", async () => {
    const user = userEvent.setup();
    render(<AdminCopyButton value="https://example.com/admin" />);

    await user.click(screen.getByRole("button", { name: "URLをコピー" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "コピー済み" })).toBeInTheDocument();
    });
  });
});
