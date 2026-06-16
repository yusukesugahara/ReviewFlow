"use client";

import { Button } from "@/components/ui/button";

type OrderMoveButtonsProps = {
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  moveUpType?: "button" | "submit";
  moveDownType?: "button" | "submit";
  moveUpLabel?: string;
  moveDownLabel?: string;
};

/**
 * 項目の並び順を変更するボタン群を表示します。
 */
export function OrderMoveButtons({
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  moveUpType = "button",
  moveDownType = "button",
  moveUpLabel = "↑",
  moveDownLabel = "↓",
}: OrderMoveButtonsProps) {
  const shouldRenderMoveUp = moveUpLabel.length > 0;
  const shouldRenderMoveDown = moveDownLabel.length > 0;

  return (
    <>
      {shouldRenderMoveUp ? (
        <Button
          type={moveUpType}
          formNoValidate={moveUpType === "submit"}
          variant="outline"
          size="sm"
          onClick={onMoveUp}
          disabled={!canMoveUp}
        >
          {moveUpLabel}
        </Button>
      ) : null}
      {shouldRenderMoveDown ? (
        <Button
          type={moveDownType}
          formNoValidate={moveDownType === "submit"}
          variant="outline"
          size="sm"
          onClick={onMoveDown}
          disabled={!canMoveDown}
        >
          {moveDownLabel}
        </Button>
      ) : null}
    </>
  );
}
