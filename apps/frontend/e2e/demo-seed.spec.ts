import { expect, test } from "@playwright/test";
import {
  DEMO_ADMIN_EMAIL,
  getDemoSpaces,
  loginAsDemoUser,
} from "./helpers/demo";

test.describe("デモseedデータ表示", () => {
  test("市民課と道路公園課の申請一覧に通常申請データが表示される", async ({
    page,
    request,
  }) => {
    const accessToken = await loginAsDemoUser(page);
    const spaces = await getDemoSpaces(request, accessToken);

    const expected = [
      {
        spaceName: "市民課",
        applicants: ["sato@example.com", "yamada@example.com", "kato@example.com"],
        forms: ["住民票写し交付申請", "マイナンバーカード窓口予約"],
      },
      {
        spaceName: "道路公園課",
        applicants: [
          "green-setsubi@example.com",
          "koji@example.com",
          "sakura-clean@example.com",
        ],
        forms: ["道路占用許可申請", "公園利用届"],
      },
    ];

    for (const item of expected) {
      const space = spaces.get(item.spaceName);
      expect(space, `${item.spaceName} がseedされていません`).toBeTruthy();

      await page.goto(`/space/${encodeURIComponent(space!.id)}/submissions`);
      await expect(page.getByRole("heading", { name: "すべての申請" })).toBeVisible();
      await expect(page.getByText("申請はまだありません")).toHaveCount(0);
      await expect(page.getByText("全5件")).toBeVisible();

      for (const form of item.forms) {
        await expect(page.getByRole("cell", { name: form }).first()).toBeVisible();
      }
      for (const applicant of item.applicants) {
        await expect(page.getByText(applicant)).toBeVisible();
      }
      for (const status of ["レビュー中", "差し戻し", "承認", "却下"]) {
        await expect(page.getByRole("cell", { name: status }).first()).toBeVisible();
      }
    }
  });

  test("各スペースの所属ユーザは職員4人で表示される", async ({
    page,
    request,
  }) => {
    const accessToken = await loginAsDemoUser(page);
    const spaces = await getDemoSpaces(request, accessToken);

    const expected = [
      {
        spaceName: "市民課",
        users: [
          DEMO_ADMIN_EMAIL,
          "citizen-reviewer@reviewflow.demo",
          "citizen-approver@reviewflow.demo",
          "citizen-operator@reviewflow.demo",
        ],
      },
      {
        spaceName: "道路公園課",
        users: [
          DEMO_ADMIN_EMAIL,
          "road-reviewer@reviewflow.demo",
          "road-approver@reviewflow.demo",
          "road-inspector@reviewflow.demo",
        ],
      },
    ];

    for (const item of expected) {
      const space = spaces.get(item.spaceName);
      expect(space, `${item.spaceName} がseedされていません`).toBeTruthy();

      await page.goto(`/space/users?spaceId=${encodeURIComponent(space!.id)}`);
      for (const email of item.users) {
        await expect(page.getByRole("cell", { name: email, exact: true })).toBeVisible();
      }
    }
  });
});
