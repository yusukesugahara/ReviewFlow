import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OrderMoveButtons } from "@/app/(authorized)/space/_components/order-move-buttons";

describe("OrderMoveButtons", () => {
  // テスト内容: 有効/無効状態の並び替えボタンが表示されることを確認する
  it("renders enabled and disabled move buttons", async () => {
    const onMoveUp = jest.fn();
    const onMoveDown = jest.fn();
    const user = userEvent.setup();
    render(
      <OrderMoveButtons
        canMoveUp
        canMoveDown={false}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
      />,
    );

    await user.click(screen.getByRole("button", { name: "↑" }));
    expect(onMoveUp).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "↓" })).toBeDisabled();
    expect(onMoveDown).not.toHaveBeenCalled();
  });

  // テスト内容: カスタムラベルと送信ボタン指定に対応することを確認する
  it("supports custom labels and submit buttons", () => {
    render(
      <OrderMoveButtons
        canMoveUp
        canMoveDown
        moveUpType="submit"
        moveDownType="submit"
        moveUpLabel="上へ"
        moveDownLabel=""
      />,
    );

    const moveUp = screen.getByRole("button", { name: "上へ" });
    expect(moveUp).toHaveAttribute("type", "submit");
    expect(moveUp).toHaveAttribute("formNoValidate");
    expect(screen.queryByRole("button", { name: "↓" })).not.toBeInTheDocument();
  });
});
