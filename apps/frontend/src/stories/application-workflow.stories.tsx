import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ApprovalProgressDiagram } from "@/components/applications/approval-progress/approval-progress-diagram";
import { ApplicationStatusBadge } from "@/components/applications/status/application-status-badge";
import { APPLICATION_STATUSES } from "@/lib/constants/applications";
import type {
  ApplicationDetailViewModel,
  ApplicationProgressStep,
} from "@/components/applications/detail/application-detail.types";

const meta = {
  title: "Design System/Application Workflow",
  parameters: {
    layout: "padded",
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const application: ApplicationDetailViewModel = {
  id: "app-1",
  applicantEmail: "applicant@example.com",
  applicationName: "施設利用申請",
  createdAt: "2026-06-19T09:00:00.000Z",
  currentStepOrder: 2,
  formDefinitionName: "施設利用申請フォーム",
  groupId: "space-1",
  status: APPLICATION_STATUSES.inReview,
  submittedAt: "2026-06-19T09:10:00.000Z",
  updatedAt: "2026-06-19T10:00:00.000Z",
  values: {},
};

const steps: ApplicationProgressStep[] = [
  {
    id: "step-1",
    stepOrder: 1,
    stepName: "一次確認",
    canReturn: true,
    status: "approved",
    assignees: [
      { id: "user-1", email: "reviewer1@example.com", name: "一次担当" },
    ],
    actions: [
      {
        id: "action-1",
        action: "approved",
        comment: "内容を確認しました。",
        actedAt: "2026-06-19T09:40:00.000Z",
        actedBy: {
          id: "user-1",
          email: "reviewer1@example.com",
          name: "一次担当",
        },
      },
    ],
  },
  {
    id: "step-2",
    stepOrder: 2,
    stepName: "管理者承認",
    canReturn: true,
    status: "current",
    assignees: [
      { id: "user-2", email: "admin@example.com", name: "管理者" },
    ],
    actions: [],
  },
  {
    id: "step-3",
    stepOrder: 3,
    stepName: "最終確認",
    canReturn: false,
    status: "pending",
    assignees: [
      { id: "user-3", email: "final@example.com", name: "最終承認者" },
    ],
    actions: [],
  },
];

export const StatusBadges: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <ApplicationStatusBadge status={APPLICATION_STATUSES.submitted} />
      <ApplicationStatusBadge status={APPLICATION_STATUSES.inReview} />
      <ApplicationStatusBadge status={APPLICATION_STATUSES.returned} />
      <ApplicationStatusBadge status={APPLICATION_STATUSES.approved} />
      <ApplicationStatusBadge status={APPLICATION_STATUSES.rejected} />
    </div>
  ),
};

export const ApprovalProgress: Story = {
  render: () => (
    <div className="w-[960px] max-w-full">
      <ApprovalProgressDiagram
        application={application}
        corrections={[]}
        fields={[]}
        steps={steps}
      />
    </div>
  ),
};
