import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import {
  prepareTenantSpace,
  uniqueE2eLabel,
} from "./helpers/auth";
import {
  createPublishedFormSetup,
  submitPublicApplicationViaUi,
} from "./helpers/public-application";

test.describe("申請一覧のCSV出力", () => {
  test("公開フォームから届いた申請をCSVとしてダウンロードできる", async ({
    page,
    request,
  }) => {
    const { session, space } = await prepareTenantSpace(
      page.context(),
      request,
      {
        emailPrefix: "csv-export",
        spaceName: uniqueE2eLabel("CSV出力確認スペース"),
      },
    );
    const setup = await createPublishedFormSetup(request, session, space);
    const applicantEmail = `${uniqueE2eLabel("csv-applicant")}@example.com`;
    const applicationValue = uniqueE2eLabel("CSV出力対象の内容");

    const { application } = await submitPublicApplicationViaUi({
      applicantEmail,
      page,
      request,
      session,
      setup,
      space,
      value: applicationValue,
    });
    expect(application.status).toBe("in_review");

    await page.goto(`/space/${space.id}/submissions`);
    await expect(
      page.getByRole("heading", { name: "すべての申請" }),
    ).toBeVisible();
    await expect(page.getByText(setup.formName).first()).toBeVisible();
    await expect(page.getByText(applicantEmail).first()).toBeVisible();

    await page.getByRole("button", { name: "CSV出力" }).click();
    const dialog = page.getByRole("dialog", { name: "CSV出力" });
    await dialog.getByRole("combobox", { name: "申請フォーム" }).click();
    await page.getByRole("option", { name: setup.formName }).click();

    const downloadPromise = page.waitForEvent("download");
    await dialog.getByRole("button", { name: /CSVを作成/ }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^export-.+\.csv$/);

    const downloadPath = await download.path();
    expect(downloadPath, "CSV download file path was not available").toBeTruthy();
    const csv = await readFile(downloadPath as string, "utf8");
    expect(csv).toContain(setup.fieldKey);
    expect(csv).toContain(applicationValue);
    expect(csv).toContain(applicantEmail);
  });
});
