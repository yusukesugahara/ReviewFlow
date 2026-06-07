import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { PublicApplicationUrlCopyButton } from "@/components/applications/public-application-url-card";

jest.mock("sonner", () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

describe("PublicApplicationUrlCopyButton", () => {
  const writeText = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
  });

  // テスト内容: 公開URLをコピーし、アクセシブルラベルが更新されることを確認する
  it("copies the public URL and updates the accessible label", async () => {
    writeText.mockResolvedValue(undefined);
    render(<PublicApplicationUrlCopyButton path="/apply/form?id=1" />);

    fireEvent.click(screen.getByRole("button", { name: "公開URLをコピー" }));

    expect(writeText).toHaveBeenCalledWith(
      `${window.location.origin}/apply/form?id=1`,
    );
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("公開URLをコピーしました");
    });
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "公開URLをコピー済み" }),
      ).toBeInTheDocument();
    });
  });

  // テスト内容: コピー失敗時にエラートーストが表示されることを確認する
  it("shows an error toast when copying fails", async () => {
    writeText.mockRejectedValue(new Error("clipboard denied"));
    render(<PublicApplicationUrlCopyButton path="/apply/form?id=1" />);

    fireEvent.click(screen.getByRole("button", { name: "公開URLをコピー" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("公開URLのコピーに失敗しました");
    });
  });
});
