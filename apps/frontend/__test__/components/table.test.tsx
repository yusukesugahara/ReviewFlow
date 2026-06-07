import { render, screen, within } from "@testing-library/react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

describe("Table", () => {
  // テスト内容: 意味のあるテーブル要素が共通スタイルで表示されることを確認する
  it("renders semantic table elements with shared table styling", () => {
    render(
      <Table>
        <TableCaption>ユーザー一覧</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>メール</TableHead>
            <TableHead>ロール</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>member@example.com</TableCell>
            <TableCell>メンバー</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={2}>1件</TableCell>
          </TableRow>
        </TableFooter>
      </Table>,
    );

    const table = screen.getByRole("table", { name: "ユーザー一覧" });
    expect(table).toHaveClass("w-full", "bg-white", "text-sm");
    expect(within(table).getByRole("columnheader", { name: "メール" })).toHaveClass(
      "h-11",
      "text-slate-500",
    );
    expect(within(table).getByRole("cell", { name: "member@example.com" })).toHaveClass(
      "px-4",
      "py-3",
    );
    expect(within(table).getByRole("cell", { name: "1件" })).toHaveAttribute(
      "colspan",
      "2",
    );
  });
});
