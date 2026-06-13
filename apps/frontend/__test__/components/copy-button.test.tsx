import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CopyButton } from "@/components/shared/copy-button";

describe("CopyButton", () => {
  it("copies values with the default labels", async () => {
    const user = userEvent.setup();
    render(<CopyButton value="https://example.com/space" />);

    await user.click(screen.getByRole("button", { name: "URLをコピー" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "コピー済み" })).toBeInTheDocument();
    });
  });

  it("supports custom labels", async () => {
    const user = userEvent.setup();
    render(
      <CopyButton
        value="https://example.com/admin"
        label="招待URLをコピー"
        copiedLabel="コピーしました"
      />,
    );

    await user.click(screen.getByRole("button", { name: "招待URLをコピー" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "コピーしました" })).toBeInTheDocument();
    });
  });
});
