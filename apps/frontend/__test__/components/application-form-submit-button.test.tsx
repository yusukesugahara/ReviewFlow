import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApplicationFormSubmitButton } from "@/components/applications/actions/application-form-submit-button";
import type { DynamicFormField } from "@/components/applications/dynamic-fields/dynamic-fields";

const fields: DynamicFormField[] = [
  {
    id: "name-1",
    fieldKey: "name",
    fieldType: "text",
    label: "氏名",
    required: true,
  },
];

function TestForm({
  onClientValidationChange = jest.fn(),
  submitForm = jest.fn(),
}: {
  onClientValidationChange?: jest.Mock;
  submitForm?: jest.Mock;
}) {
  return (
    <>
      <form id="test-form">
        <input name="field:name" defaultValue="山田 太郎" />
      </form>
      <ApplicationFormSubmitButton
        formId="test-form"
        fields={fields}
        submitLabel="申請を送信"
        pendingLabel="送信中..."
        confirmTitle="申請内容の確認"
        confirmDescription="入力内容を確認してください。"
        confirmButtonLabel="申請する"
        isPending={false}
        onClientValidationChange={onClientValidationChange}
        submitForm={submitForm}
      />
    </>
  );
}

describe("ApplicationFormSubmitButton", () => {
  it("opens a confirmation dialog with entered values", async () => {
    const user = userEvent.setup();
    render(<TestForm />);

    await user.click(screen.getByRole("button", { name: "申請を送信" }));

    expect(screen.getByRole("heading", { name: "申請内容の確認" })).toBeInTheDocument();
    expect(screen.getByText("氏名")).toBeInTheDocument();
    expect(screen.getByText("山田 太郎")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "申請する" })).toBeInTheDocument();
  });

  it("submits the form data when confirmed", async () => {
    const user = userEvent.setup();
    const submitForm = jest.fn();
    render(<TestForm submitForm={submitForm} />);

    await user.click(screen.getByRole("button", { name: "申請を送信" }));
    await user.click(screen.getByRole("button", { name: "申請する" }));

    expect(submitForm).toHaveBeenCalledTimes(1);
    const formData = submitForm.mock.calls[0]?.[0] as FormData;
    expect(formData.get("field:name")).toBe("山田 太郎");
    expect(screen.queryByRole("heading", { name: "申請内容の確認" })).not.toBeInTheDocument();
  });

  it("reports client validation errors for missing required fields", async () => {
    const user = userEvent.setup();
    const onClientValidationChange = jest.fn();
    render(
      <>
        <form id="test-form">
          <input name="field:name" defaultValue="" />
        </form>
        <ApplicationFormSubmitButton
          formId="test-form"
          fields={fields}
          submitLabel="申請を送信"
          pendingLabel="送信中..."
          confirmTitle="申請内容の確認"
          confirmDescription="入力内容を確認してください。"
          confirmButtonLabel="申請する"
          isPending={false}
          onClientValidationChange={onClientValidationChange}
          submitForm={jest.fn()}
        />
      </>,
    );

    await user.click(screen.getByRole("button", { name: "申請を送信" }));

    expect(onClientValidationChange).toHaveBeenCalledWith({
      formError: "未入力の必須項目があります",
      fieldErrors: { name: "必須項目です" },
      missingFieldLabels: ["氏名"],
    });
    expect(screen.queryByRole("heading", { name: "申請内容の確認" })).not.toBeInTheDocument();
  });
});
