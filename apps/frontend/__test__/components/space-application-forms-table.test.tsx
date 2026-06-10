import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { SpaceApplicationFormsTable } from "@/app/(authorized)/space/[spaceId]/applications/_components/space-application-forms-table";
import { APPLICATION_STATUSES } from "@/lib/constants/applications";

jest.mock("sonner", () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

describe("SpaceApplicationFormsTable", () => {
  const writeText = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
  });

  // テスト内容: 申請フォームの公開URLをクリップボードへコピーできることを確認する
  it("copies the public application URL", async () => {
    writeText.mockResolvedValue(undefined);
    render(
      <SpaceApplicationFormsTable
        onArchive={jest.fn()}
        onRestore={jest.fn()}
        rows={[
          {
            definitionId: "definition-1",
            detailHref: "/space/space-1/applications/setup-1",
            pendingCount: 1,
            processedCount: 2,
            publicHref: "/apply/space-1?formDefinitionId=definition-1",
            status: APPLICATION_STATUSES.published,
            title: "稟議フォーム",
          },
        ]}
        showArchived={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "公開URLをコピー" }));

    expect(writeText).toHaveBeenCalledWith(
      `${window.location.origin}/apply/space-1?formDefinitionId=definition-1`,
    );
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("公開URLをコピーしました");
    });
  });

  // テスト内容: 公開URLコピー失敗時にエラートーストを表示することを確認する
  it("shows an error toast when public URL copy fails", async () => {
    writeText.mockRejectedValue(new Error("clipboard denied"));
    render(
      <SpaceApplicationFormsTable
        onArchive={jest.fn()}
        onRestore={jest.fn()}
        rows={[
          {
            definitionId: "definition-1",
            detailHref: "/space/space-1/applications/setup-1",
            pendingCount: 1,
            processedCount: 2,
            publicHref: "/apply/space-1?formDefinitionId=definition-1",
            status: APPLICATION_STATUSES.published,
            title: "稟議フォーム",
          },
        ]}
        showArchived={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "公開URLをコピー" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("公開URLのコピーに失敗しました");
    });
  });
});
