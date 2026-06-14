import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { SpaceList } from "@/app/(authorized)/admin/spaces/_components/space-list";
import type { SpaceListItem } from "@/app/(authorized)/admin/spaces/types";

const action = jest.fn(async () => undefined);

const spaces: SpaceListItem[] = [
  {
    group: {
      id: "space-1",
      name: "営業部",
      description: "営業用スペース",
      createdByUserId: "user-1",
      createdAt: "2026-06-06T00:00:00.000Z",
      updatedAt: "2026-06-06T00:00:00.000Z",
      currentUserRole: "admin",
    },
    members: [
      {
        id: "member-current",
        groupId: "space-1",
        userId: "user-current",
        email: "me@example.com",
        name: "Current User",
        role: "admin",
        createdAt: "2026-06-06T00:00:00.000Z",
        updatedAt: "2026-06-06T00:00:00.000Z",
      },
      {
        id: "member-other",
        groupId: "space-1",
        userId: "user-other",
        email: "other@example.com",
        name: null,
        role: "user",
        createdAt: "2026-06-06T00:00:00.000Z",
        updatedAt: "2026-06-06T00:00:00.000Z",
      },
    ],
    addableUsers: [
      {
        id: "user-add",
        email: "add@example.com",
        name: "Add User",
      },
    ],
    canManageSpace: true,
  },
];

function renderSpaceList(props?: Partial<ComponentProps<typeof SpaceList>>) {
  return render(
    <SpaceList
      spaces={spaces}
      currentUserId="user-current"
      isSystemAdmin
      addMemberAction={action}
      inviteSpaceMemberAction={action}
      updateSpaceAction={action}
      updateMemberRoleAction={action}
      removeMemberAction={action}
      leaveSpaceAction={action}
      removeSpaceAction={action}
      {...props}
    />,
  );
}

describe("SpaceList", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      bottom: 40,
      height: 32,
      left: 200,
      right: 240,
      top: 8,
      width: 40,
      x: 200,
      y: 8,
      toJSON: () => ({}),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // テスト内容: スペース詳細を開くとメンバー一覧と操作メニューが表示されることを確認する
  it("renders members and opens the member action menu", async () => {
    const user = userEvent.setup();
    renderSpaceList();

    await user.click(screen.getByRole("button", { name: "営業部 営業用スペース" }));

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("Current User")).toBeInTheDocument();
    expect(screen.getByText("other@example.com")).toBeInTheDocument();
    expect(screen.getByText("スペース管理者")).toBeInTheDocument();
    expect(screen.getByText("スペースユーザ")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "other@example.com の操作" }));
    const menu = screen.getByRole("menu");

    expect(within(menu).getByRole("menuitem", { name: "管理者に変更" })).toBeInTheDocument();
    expect(within(menu).getByRole("menuitem", { name: "外す" })).toBeInTheDocument();
  });

  // テスト内容: メンバー追加ダイアログが既存ユーザ追加と招待フォームを表示することを確認する
  it("opens the member add dialog for manageable spaces", async () => {
    const user = userEvent.setup();
    renderSpaceList();

    await user.click(screen.getByRole("button", { name: "営業部 営業用スペース" }));
    await user.click(screen.getByRole("button", { name: "メンバーを追加または招待" }));

    expect(screen.getByRole("heading", { name: "メンバーを追加" })).toBeInTheDocument();
    expect(screen.getByText("既存ユーザを追加")).toBeInTheDocument();
    expect(screen.getByText("メールでスペースへ招待")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("member@example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "追加" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "招待" })).toBeEnabled();
  });

  // テスト内容: テナント管理者はスペース編集ダイアログを開けることを確認する
  it("opens the space details edit dialog for tenant admins", async () => {
    const user = userEvent.setup();
    renderSpaceList();

    await user.click(screen.getByRole("button", { name: "営業部を編集" }));

    expect(screen.getByRole("heading", { name: "スペースを編集" })).toBeInTheDocument();
    expect(screen.getByLabelText("スペース名")).toHaveValue("営業部");
    expect(screen.getByLabelText("説明文")).toHaveValue("営業用スペース");
    expect(screen.getByRole("button", { name: "保存" })).toBeEnabled();

    const overlay = screen.getByRole("dialog").previousElementSibling;
    expect(overlay).not.toBeNull();
    await user.click(overlay as Element);
    expect(screen.queryByRole("heading", { name: "スペースを編集" })).not.toBeInTheDocument();
  });

  // テスト内容: テナント管理者でない場合はスペース編集ボタンを表示しないことを確認する
  it("hides the space details edit button for non tenant admins", () => {
    renderSpaceList({ isSystemAdmin: false });

    expect(screen.queryByRole("button", { name: "営業部を編集" })).not.toBeInTheDocument();
  });
});
