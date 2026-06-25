import { render, screen } from "@testing-library/react";
import {
  ApplicationFieldsCard,
  CorrectionHistory,
} from "@/components/applications/detail/application-detail-sections";
import type {
  ApplicationCorrection,
  ApplicationDetailViewModel,
  ApplicationFormField,
} from "@/components/applications/detail/application-detail.types";

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

  it("renders return field controls when returning is allowed", () => {
    render(
      <ApplicationFieldsCard
        application={{ ...application, status: "in_review", currentStepOrder: 1 }}
        canReturnApplication
        description="入力された値を確認できます"
        fields={fields}
        openCorrectionItems={[
          {
            formFieldId: "field-1",
            fieldKey: "certificate_type",
            label: "証明書種別",
          },
        ]}
        returnAction={jest.fn()}
        title="申請内容"
      />,
    );

    expect(screen.getByLabelText("差し戻し全体コメント（任意）")).toBeInTheDocument();
    expect(screen.getByDisplayValue("1")).toHaveAttribute(
      "name",
      "expectedStepOrder",
    );
    expect(screen.getAllByText("この項目を差し戻し対象にする")).toHaveLength(2);
    expect(screen.getByText("差し戻し対象項目です")).toBeInTheDocument();
  });

  it("dims fields that were not changed in the latest returned correction", () => {
    render(
      <ApplicationFieldsCard
        application={application}
        canReturnApplication={false}
        correctedFieldKeys={["certificate_type"]}
        description="入力された値を確認できます"
        fields={fields}
        openCorrectionItems={[]}
        title="申請内容"
      />,
    );

    expect(screen.getByText("住民票の写し").closest(".grid")).not.toHaveClass(
      "opacity-60",
    );
    expect(screen.getByText("勤務先への提出").closest(".grid")).toHaveClass(
      "opacity-60",
    );
  });

  it("renders correction history field labels instead of raw field keys", () => {
    const corrections: ApplicationCorrection[] = [
      {
        id: "correction-1",
        status: "open",
        overallComment: null,
        createdAt: "2026-06-07T00:00:00.000Z",
        items: [
          {
            formFieldId: "field-1",
            fieldKey: "procedure_type",
            comment: "手続き種別を確認してください",
          },
        ],
      },
    ];

    render(
      <CorrectionHistory
        corrections={corrections}
        fields={fields}
        values={{ certificate_type: "resident_record" }}
      />,
    );

    expect(screen.getByText("証明書種別:")).toBeInTheDocument();
    expect(screen.getByText("申請内容")).toBeInTheDocument();
    expect(screen.getByText("住民票の写し")).toBeInTheDocument();
    expect(screen.queryByText("procedure_type:")).not.toBeInTheDocument();
  });
});
