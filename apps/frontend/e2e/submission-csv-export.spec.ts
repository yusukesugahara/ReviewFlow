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

  test("選択した申請フォームの申請だけをCSVに出力できる", async ({
    page,
    request,
  }) => {
    const { session, space } = await prepareTenantSpace(
      page.context(),
      request,
      {
        emailPrefix: "csv-export-filter",
        spaceName: uniqueE2eLabel("CSVフォーム絞り込みスペース"),
      },
    );
    const targetSetup = await createPublishedFormSetup(request, session, space, {
      formNamePrefix: "CSV対象フォーム",
      fields: [
        {
          fieldKey: "target_csv_detail",
          fieldType: "text",
          label: uniqueE2eLabel("CSV対象項目"),
          required: true,
        },
      ],
    });
    const otherSetup = await createPublishedFormSetup(request, session, space, {
      formNamePrefix: "CSV対象外フォーム",
      fields: [
        {
          fieldKey: "other_csv_detail",
          fieldType: "text",
          label: uniqueE2eLabel("CSV対象外項目"),
          required: true,
        },
      ],
    });
    const targetApplicantEmail = `${uniqueE2eLabel(
      "csv-target-applicant",
    )}@example.com`;
    const otherApplicantEmail = `${uniqueE2eLabel(
      "csv-other-applicant",
    )}@example.com`;
    const targetValue = uniqueE2eLabel("CSVに含める内容");
    const otherValue = uniqueE2eLabel("CSVに含めない内容");

    const { application: targetApplication } =
      await submitPublicApplicationViaUi({
        applicantEmail: targetApplicantEmail,
        page,
        request,
        session,
        setup: targetSetup,
        space,
        value: targetValue,
      });
    const { application: otherApplication } =
      await submitPublicApplicationViaUi({
        applicantEmail: otherApplicantEmail,
        page,
        request,
        session,
        setup: otherSetup,
        space,
        value: otherValue,
      });
    expect(targetApplication.status).toBe("in_review");
    expect(otherApplication.status).toBe("in_review");

    await page.goto(`/space/${space.id}/submissions`);
    await expect(page.getByText(targetSetup.formName).first()).toBeVisible();
    await expect(page.getByText(otherSetup.formName).first()).toBeVisible();

    await page.getByRole("button", { name: "CSV出力" }).click();
    const dialog = page.getByRole("dialog", { name: "CSV出力" });
    await dialog.getByRole("combobox", { name: "申請フォーム" }).click();
    await page.getByRole("option", { name: targetSetup.formName }).click();

    const downloadPromise = page.waitForEvent("download");
    await dialog.getByRole("button", { name: /CSVを作成/ }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^export-.+\.csv$/);

    const downloadPath = await download.path();
    expect(downloadPath, "CSV download file path was not available").toBeTruthy();
    const csv = await readFile(downloadPath as string, "utf8");
    expect(csv).toContain(targetSetup.fieldKey);
    expect(csv).toContain(targetValue);
    expect(csv).toContain(targetApplicantEmail);
    expect(csv).toContain(targetApplication.id);
    expect(csv).not.toContain(otherSetup.fieldKey);
    expect(csv).not.toContain(otherValue);
    expect(csv).not.toContain(otherApplicantEmail);
    expect(csv).not.toContain(otherApplication.id);
  });
});
