import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApprovalFlowSelector } from "@/app/(authorized)/space/_components/approval-flow-selector";

const flows = [
  {
    id: "flow-1",
    name: "標準フロー",
    isActive: true,
    steps: [
      {
        id: "step-2",
        stepOrder: 2,
        stepName: "最終承認",
        assigneeUserId: "user-2",
        canReturn: false,
      },
      {
        id: "step-1",
        stepOrder: 1,
        stepName: "一次承認",
        assigneeUserId: "user-1",
        assigneeUserIds: ["user-1", "user-3"],
        canReturn: true,
      },
    ],
  },
  {
    id: "flow-2",
    name: "停止中フロー",
    isActive: false,
    steps: [],
  },
];

describe("ApprovalFlowSelector", () => {
  // テスト内容: 承認フローがない場合の空状態が表示されることを確認する
  it("renders an empty state when no approval flows exist", () => {
    render(<ApprovalFlowSelector flows={[]} />);

    expect(screen.getByText("承認フローがまだありません")).toBeInTheDocument();
  });

  // テスト内容: 選択中の承認フローのプレビューと切り替えを確認する
  it("previews the selected flow and switches flows", async () => {
    const user = userEvent.setup();
    render(<ApprovalFlowSelector flows={flows} />);

    expect(screen.getByRole("heading", { name: "標準フロー" })).toBeInTheDocument();
    expect(screen.getByText("Flow ID: flow-1")).toBeInTheDocument();
    expect(screen.getByText("一次承認")).toBeInTheDocument();
    expect(screen.getByText("承認者: 2人")).toBeInTheDocument();
    expect(screen.getByText("差し戻し可")).toBeInTheDocument();
    expect(screen.getByText("最終承認")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /停止中フロー/ }));

    expect(screen.getByRole("heading", { name: "停止中フロー" })).toBeInTheDocument();
    expect(screen.getByText("Flow ID: flow-2")).toBeInTheDocument();
  });
});
