import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Check, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const meta = {
  title: "Design System/UI",
  parameters: {
    layout: "padded",
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Buttons: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button>
        <Send />
        申請する
      </Button>
      <Button variant="outline">下書き保存</Button>
      <Button variant="secondary">戻る</Button>
      <Button variant="destructive">却下する</Button>
      <Button size="icon" aria-label="承認">
        <Check />
      </Button>
    </div>
  ),
};

export const Inputs: Story = {
  render: () => (
    <div className="grid w-[360px] gap-3">
      <Input placeholder="申請者メールアドレス" type="email" />
      <Input placeholder="申請タイトル" />
      <Input disabled value="承認済み申請は編集できません" />
    </div>
  ),
};

export const Badges: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Badge>通常</Badge>
      <Badge variant="secondary">補助情報</Badge>
      <Badge variant="outline">下書き</Badge>
      <Badge variant="destructive">要確認</Badge>
    </div>
  ),
};
