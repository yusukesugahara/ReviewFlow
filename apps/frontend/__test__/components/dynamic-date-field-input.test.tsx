import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DynamicDateFieldInput } from "@/components/applications/dynamic-date-field-input";

const field = {
  id: "date-1",
  fieldKey: "startDate",
  fieldType: "date",
  label: "開始日",
  required: true,
};

describe("DynamicDateFieldInput", () => {
  it("renders a calendar trigger instead of a native date input", () => {
    render(
      <DynamicDateFieldInput
        field={field}
        name="field:startDate"
        stringValue=""
        selectedValues={[]}
        options={[]}
        variant="table"
      />,
    );

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /日付を選択/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /日付を選択/ })).toHaveAttribute(
      "aria-haspopup",
      "dialog",
    );
  });

  it("opens the calendar and stores the selected date", async () => {
    const user = userEvent.setup();
    render(
      <DynamicDateFieldInput
        field={field}
        name="field:startDate"
        stringValue=""
        selectedValues={[]}
        options={[]}
        variant="table"
      />,
    );

    await user.click(screen.getByRole("button", { name: /日付を選択/ }));
    await user.click(screen.getByRole("button", { name: "15" }));

    expect(screen.getByDisplayValue(/\d{4}-\d{2}-15/)).toHaveAttribute("name", "field:startDate");
  });
});
