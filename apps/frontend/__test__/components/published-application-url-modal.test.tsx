import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PublishedApplicationUrlModal } from "@/app/(authorized)/space/_components/published-application-url-modal";

Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined),
  },
});

describe("PublishedApplicationUrlModal", () => {
  // テスト内容: 公開URLが表示され、モーダルを閉じられることを確認する
  it("renders the published URL and closes the modal", async () => {
    const user = userEvent.setup();
    render(
      <PublishedApplicationUrlModal
        formDefinitionId="definition-1"
        groupId="space-1"
        open
      />,
    );

    expect(screen.getByRole("heading", { name: "申請URLを発行しました" })).toBeInTheDocument();
    expect(screen.getByText("http://localhost/apply/space-1?formDefinitionId=definition-1")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "閉じる" }));

    expect(screen.queryByRole("heading", { name: "申請URLを発行しました" })).not.toBeInTheDocument();
  });

  // テスト内容: グループIDがない場合や閉じている場合に表示されないことを確認する
  it("does not render without a group id or when closed", () => {
    const { unmount } = render(<PublishedApplicationUrlModal open />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    unmount();
    render(<PublishedApplicationUrlModal groupId="space-1" open={false} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
