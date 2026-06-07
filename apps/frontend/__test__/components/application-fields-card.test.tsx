import { render, screen } from "@testing-library/react";
import { ApplicationFieldsCard } from "@/components/applications/application-detail-sections";
import type {
  ApplicationDetailViewModel,
  ApplicationFormField,
} from "@/components/applications/application-detail.types";

const application: ApplicationDetailViewModel = {
  id: "app-1",
  status: "approved",
  values: {
    certificate_type: "resident_record",
    purpose: "勤務先への提出",
  },
};

const fields: ApplicationFormField[] = [
  {
    id: "field-1",
    fieldKey: "certificate_type",
    label: "証明書種別",
    fieldType: "select",
    required: true,
    options: [
      { value: "resident_record", label: "住民票の写し" },
      { value: "deleted_record", label: "除票の写し" },
    ],
  },
  {
    id: "field-2",
    fieldKey: "purpose",
    label: "使用目的",
    fieldType: "textarea",
    required: true,
  },
];

describe("ApplicationFieldsCard", () => {
  it("renders saved select values as text in read-only application details", () => {
    render(
      <ApplicationFieldsCard
        application={application}
        canReturnApplication={false}
        description="入力された値を確認できます"
        fields={fields}
        openCorrectionItems={[]}
        title="申請内容"
      />,
    );

    expect(screen.getByText("住民票の写し")).toBeInTheDocument();
    expect(screen.getByText("勤務先への提出")).toBeInTheDocument();
    expect(screen.queryByText("選択してください")).not.toBeInTheDocument();
  });
});
