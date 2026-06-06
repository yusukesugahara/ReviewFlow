import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SpaceManagementHeader } from "@/app/(authorized)/admin/spaces/_components/space-management-header";

const createSpaceAction = jest.fn(async () => undefined);

describe("SpaceManagementHeader", () => {
  // テスト内容: 作成権限がない場合に作成操作が非表示になることを確認する
  it("hides create controls when creation is not allowed", () => {
    render(
      <SpaceManagementHeader
        canCreateSpace={false}
        users={[]}
        createSpaceAction={createSpaceAction}
      />,
    );

    expect(screen.queryByRole("button", { name: "スペースを作成" })).not.toBeInTheDocument();
  });

  // テスト内容: 作成フォームが開き、初期管理者を選択できることを確認する
  it("opens the create form and renders selectable initial admins", async () => {
    const user = userEvent.setup();
    render(
      <SpaceManagementHeader
        canCreateSpace
        users={[
          { id: "user-1", email: "admin@example.com", name: "Admin User" },
          { id: "user-2", email: "member@example.com", name: null },
        ]}
        createSpaceAction={createSpaceAction}
      />,
    );

    await user.click(screen.getByRole("button", { name: "スペースを作成" }));

    expect(screen.getByRole("heading", { name: "新しいスペースを作成" })).toBeInTheDocument();
    expect(screen.getByLabelText("スペース名")).toBeRequired();
    expect(screen.getByLabelText("説明")).toBeInTheDocument();
    expect(screen.getByLabelText(/Admin User/)).toHaveAttribute("value", "user-1");
    expect(screen.getByLabelText(/member@example.com/)).toHaveAttribute("value", "user-2");
    expect(screen.getByRole("button", { name: "作成" })).toHaveAttribute(
      "type",
      "submit",
    );
  });
});
