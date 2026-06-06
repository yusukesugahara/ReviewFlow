import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApprovalStepsBuilder } from "@/app/(authorized)/space/_components/approval-steps-builder";

const assignees = [
  { id: "user-1", label: "田中 太郎 <tanaka@example.com>" },
  { id: "user-2", label: "佐藤 花子 <sato@example.com>" },
];

describe("ApprovalStepsBuilder", () => {
  // テスト内容: 既定ステップが表示され、hidden inputへシリアライズされることを確認する
  it("renders default steps and serializes them to a hidden input", () => {
    render(<ApprovalStepsBuilder assignees={assignees} />);

    expect(screen.getByText("承認グループはまだありません。")).toBeInTheDocument();
    expect(screen.getByDisplayValue("一次承認")).toBeInTheDocument();
    expect(screen.getByDisplayValue("最終承認")).toBeInTheDocument();
    expect(screen.getByDisplayValue(/step-1/)).toHaveAttribute("name", "stepsJson");
  });

  // テスト内容: ステップ追加と承認者検索選択/解除ができることを確認する
  it("adds/removes steps and selects assignees through search", async () => {
    const user = userEvent.setup();
    render(<ApprovalStepsBuilder assignees={assignees} defaultSteps={[]} />);

    await user.click(screen.getByRole("button", { name: "ステップ追加" }));
    expect(screen.getByDisplayValue("承認ステップ3")).toBeInTheDocument();

    const searchInputs = screen.getAllByPlaceholderText("承認者を検索");
    await user.type(searchInputs[0]!, "田中");
    await user.click(screen.getByRole("button", { name: "田中 太郎 <tanaka@example.com>" }));

    expect(screen.getByText("田中 太郎 <tanaka@example.com>")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "田中 太郎 <tanaka@example.com>を外す" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "田中 太郎 <tanaka@example.com>を外す" }));
    expect(screen.queryByText("田中 太郎 <tanaka@example.com>")).not.toBeInTheDocument();
  });

  // テスト内容: 承認グループ作成とメンバー未選択の検証表示を確認する
  it("creates an approval group and validates missing members", async () => {
    const user = userEvent.setup();
    render(<ApprovalStepsBuilder assignees={assignees} />);

    await user.click(screen.getByRole("button", { name: "グループ追加" }));

    expect(screen.getByDisplayValue("承認グループ1")).toBeInTheDocument();
    expect(screen.getByText("メンバーを1人以上選択してください。")).toBeInTheDocument();
  });
});
