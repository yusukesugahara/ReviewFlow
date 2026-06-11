import type {
  SpaceUserActionMenuState,
  SpaceUserTableMember,
} from "../space-users-table";

type SpaceUserActionMenuProps = {
  currentUserId: string | null;
  menu: SpaceUserActionMenuState;
  onClose: () => void;
  onDelete: (member: SpaceUserTableMember) => void;
  onRoleChange: (member: SpaceUserTableMember) => void;
};

export function SpaceUserActionMenu({
  currentUserId,
  menu,
  onClose,
  onDelete,
  onRoleChange,
}: SpaceUserActionMenuProps) {
  return (
    <>
      <button
        type="button"
        aria-label="メニューを閉じる"
        className="fixed inset-0 z-40 cursor-default bg-transparent"
        onClick={onClose}
      />
      <div
        className="fixed z-50 w-48 rounded-md border border-slate-200 bg-white p-1 text-left shadow-lg"
        role="menu"
        style={{ left: menu.left, top: menu.top }}
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            onClose();
          }
        }}
      >
        <button
          type="button"
          className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-slate-100 focus-visible:bg-slate-100 focus-visible:outline-none"
          role="menuitem"
          onClick={() => onRoleChange(menu.member)}
        >
          スペースロールを変更
        </button>
        {menu.member.userId !== currentUserId ? (
          <button
            type="button"
            className="block w-full rounded px-3 py-2 text-left text-sm text-destructive hover:bg-rose-50 focus-visible:bg-rose-50 focus-visible:outline-none"
            role="menuitem"
            onClick={() => onDelete(menu.member)}
          >
            削除
          </button>
        ) : null}
      </div>
    </>
  );
}
