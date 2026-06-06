import { render, screen } from "@testing-library/react";
import { ApplicantApplicationActions } from "@/app/_components/applications/applicant-application-actions";

const noopAction = jest.fn(async () => undefined);

describe("ApplicantApplicationActions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // テスト内容: 許可された操作がない場合に何も表示されないことを確認する
  it("renders nothing when no actions are allowed", () => {
    const { container } = render(
      <ApplicantApplicationActions
        capabilities={{
          canEditApplication: false,
          canSubmitApplication: false,
          canResubmitApplication: false,
        }}
        editHref="/edit"
        submitAction={noopAction}
        resubmitAction={noopAction}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  // テスト内容: 申請者に許可された操作が表示されることを確認する
  it("renders allowed applicant actions", () => {
    render(
      <ApplicantApplicationActions
        capabilities={{
          canEditApplication: true,
          canSubmitApplication: true,
          canResubmitApplication: true,
        }}
        canResendReturnEmail
        editHref="/edit"
        resendReturnEmailAction={noopAction}
        submitAction={noopAction}
        resubmitAction={noopAction}
      />,
    );

    expect(screen.getByRole("link", { name: "編集する" })).toHaveAttribute(
      "href",
      "/edit",
    );
    expect(screen.getByRole("button", { name: "提出する" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "再提出する" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "差し戻しメールを再送" }),
    ).toBeInTheDocument();
  });
});
