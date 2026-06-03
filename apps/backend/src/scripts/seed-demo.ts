import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { DataSource, EntityManager, type DataSourceOptions } from 'typeorm';
import { buildTypeOrmOptions } from '../app/typeorm-options.factory';
import { ApplicationApprovalAction } from '../models/constants/application-approval-action';
import { ApplicationStatus } from '../models/constants/application-status';
import { CorrectionRequestStatus } from '../models/constants/correction-request-status';
import { FormDefinitionStatus } from '../models/constants/form-definition-status';
import { FormFieldType } from '../models/constants/form-field-type';
import { GroupMemberRole } from '../models/constants/group-member-role';
import { TenantPlan, TenantStatus } from '../models/constants/tenant-enums';
import { UserRole } from '../models/constants/user-role';
import { ApplicationApproval } from '../models/entities/application-approval.entity';
import { ApplicationFieldValue } from '../models/entities/application-field-value.entity';
import { Application } from '../models/entities/application.entity';
import { ApprovalFlow } from '../models/entities/approval-flow.entity';
import { ApprovalStep } from '../models/entities/approval-step.entity';
import { CorrectionRequestItem } from '../models/entities/correction-request-item.entity';
import { CorrectionRequest } from '../models/entities/correction-request.entity';
import { FormDefinition } from '../models/entities/form-definition.entity';
import { FormField } from '../models/entities/form-field.entity';
import { GroupMember } from '../models/entities/group-member.entity';
import { Group } from '../models/entities/group.entity';
import { Tenant } from '../models/entities/tenant.entity';
import { User } from '../models/entities/user.entity';

const DEMO_TENANT_NAME = 'ReviewFlow Demo';
const DEMO_PASSWORD = 'Password123!';

type DemoUserKey = 'admin' | 'manager' | 'finance' | 'applicant';

type DemoFormDefinition = {
  description: string;
  fields: Array<{
    fieldKey: string;
    fieldType: (typeof FormFieldType)[keyof typeof FormFieldType];
    helpText?: string | null;
    label: string;
    optionsJson?: unknown[] | null;
    placeholder?: string | null;
    required: boolean;
  }>;
  name: string;
};

type DemoApplication = {
  applicant: DemoUserKey | null;
  applicantEmail: string;
  createdAt: Date;
  currentStepOrder: number | null;
  status: (typeof ApplicationStatus)[keyof typeof ApplicationStatus];
  submittedAt: Date | null;
  updatedAt: Date;
  values: Record<string, unknown>;
};

async function main() {
  const config = new ConfigService(process.env);
  const dataSource = new DataSource(
    buildTypeOrmOptions(config) as DataSourceOptions,
  );
  await dataSource.initialize();

  try {
    const result = await dataSource.transaction(async (manager) => {
      const tenantRepo = manager.getRepository(Tenant);
      const existingTenant = await tenantRepo.findOne({
        where: { name: DEMO_TENANT_NAME },
      });
      if (existingTenant) {
        await tenantRepo.remove(existingTenant);
      }

      const tenant = await tenantRepo.save(
        tenantRepo.create({
          name: DEMO_TENANT_NAME,
          plan: TenantPlan.PRO,
          status: TenantStatus.ACTIVE,
        }),
      );

      const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
      const users = await createUsers(manager, tenant.id, passwordHash);
      const group = await createGroup(manager, tenant.id, users);
      await createGroupMembers(manager, tenant.id, group.id, users);
      const approvalFlow = await createApprovalFlow(
        manager,
        tenant.id,
        group.id,
        users,
      );
      const formDefinitions = await createFormDefinitions(
        manager,
        tenant.id,
        group.id,
        users.admin.id,
      );

      for (const formDefinition of formDefinitions) {
        await createFormSetupApplication(manager, {
          approvalFlowId: approvalFlow.id,
          createdByUserId: users.admin.id,
          formDefinition,
          groupId: group.id,
          tenantId: tenant.id,
        });
      }

      await createExpenseApplications(manager, {
        approvalFlow,
        applicantUserId: users.applicant.id,
        financeUserId: users.finance.id,
        formDefinition: formDefinitions[0],
        groupId: group.id,
        managerUserId: users.manager.id,
        tenantId: tenant.id,
      });

      return {
        tenantId: tenant.id,
        spaceId: group.id,
      };
    });

    console.log('Demo seed completed.');
    console.log(`Tenant: ${DEMO_TENANT_NAME} (${result.tenantId})`);
    console.log(`Space ID: ${result.spaceId}`);
    console.log(`Admin: admin@reviewflow.demo / ${DEMO_PASSWORD}`);
    console.log(`Manager: manager@reviewflow.demo / ${DEMO_PASSWORD}`);
    console.log(`Finance: finance@reviewflow.demo / ${DEMO_PASSWORD}`);
    console.log(`Applicant: applicant@reviewflow.demo / ${DEMO_PASSWORD}`);
  } finally {
    await dataSource.destroy();
  }
}

async function createUsers(
  manager: EntityManager,
  tenantId: string,
  passwordHash: string,
): Promise<Record<DemoUserKey, User>> {
  const userRepo = manager.getRepository(User);
  const rows = {
    admin: userRepo.create({
      tenantId,
      name: '佐藤 玲奈',
      email: 'admin@reviewflow.demo',
      passwordHash,
      role: UserRole.TENANT_ADMIN,
      isActive: true,
    }),
    manager: userRepo.create({
      tenantId,
      name: '田中 健',
      email: 'manager@reviewflow.demo',
      passwordHash,
      role: UserRole.TENANT_USER,
      isActive: true,
    }),
    finance: userRepo.create({
      tenantId,
      name: '山本 美咲',
      email: 'finance@reviewflow.demo',
      passwordHash,
      role: UserRole.TENANT_USER,
      isActive: true,
    }),
    applicant: userRepo.create({
      tenantId,
      name: '高橋 翔太',
      email: 'applicant@reviewflow.demo',
      passwordHash,
      role: UserRole.TENANT_USER,
      isActive: true,
    }),
  };

  return {
    admin: await userRepo.save(rows.admin),
    manager: await userRepo.save(rows.manager),
    finance: await userRepo.save(rows.finance),
    applicant: await userRepo.save(rows.applicant),
  };
}

async function createGroup(
  manager: EntityManager,
  tenantId: string,
  users: Record<DemoUserKey, User>,
): Promise<Group> {
  const groupRepo = manager.getRepository(Group);
  return groupRepo.save(
    groupRepo.create({
      tenantId,
      name: 'コーポレート業務',
      description: '経費精算、稟議、備品購入などの社内申請を扱うデモスペース',
      createdByUserId: users.admin.id,
    }),
  );
}

async function createGroupMembers(
  manager: EntityManager,
  tenantId: string,
  groupId: string,
  users: Record<DemoUserKey, User>,
) {
  const memberRepo = manager.getRepository(GroupMember);
  await memberRepo.save([
    memberRepo.create({
      tenantId,
      groupId,
      userId: users.admin.id,
      role: GroupMemberRole.ADMIN,
      invitedByUserId: users.admin.id,
    }),
    memberRepo.create({
      tenantId,
      groupId,
      userId: users.manager.id,
      role: GroupMemberRole.USER,
      invitedByUserId: users.admin.id,
    }),
    memberRepo.create({
      tenantId,
      groupId,
      userId: users.finance.id,
      role: GroupMemberRole.USER,
      invitedByUserId: users.admin.id,
    }),
    memberRepo.create({
      tenantId,
      groupId,
      userId: users.applicant.id,
      role: GroupMemberRole.USER,
      invitedByUserId: users.admin.id,
    }),
  ]);
}

async function createApprovalFlow(
  manager: EntityManager,
  tenantId: string,
  groupId: string,
  users: Record<DemoUserKey, User>,
): Promise<ApprovalFlow> {
  const flowRepo = manager.getRepository(ApprovalFlow);
  const stepRepo = manager.getRepository(ApprovalStep);
  const flow = await flowRepo.save(
    flowRepo.create({
      tenantId,
      groupId,
      name: '部門長・経理承認フロー',
      isActive: true,
    }),
  );
  await stepRepo.save([
    stepRepo.create({
      tenantId,
      groupId,
      approvalFlowId: flow.id,
      stepOrder: 1,
      stepName: '部門長承認',
      assigneeUserId: users.manager.id,
      assigneeUserIds: [users.manager.id],
      canReturn: true,
    }),
    stepRepo.create({
      tenantId,
      groupId,
      approvalFlowId: flow.id,
      stepOrder: 2,
      stepName: '経理確認',
      assigneeUserId: users.finance.id,
      assigneeUserIds: [users.finance.id],
      canReturn: false,
    }),
  ]);
  return flow;
}

async function createFormDefinitions(
  manager: EntityManager,
  tenantId: string,
  groupId: string,
  createdByUserId: string,
): Promise<FormDefinition[]> {
  const definitions: DemoFormDefinition[] = [
    {
      name: '経費精算申請',
      description: '交通費、会議費、備品購入などの立替経費を申請します。',
      fields: [
        {
          fieldKey: 'expense_title',
          label: '件名',
          fieldType: FormFieldType.TEXT,
          required: true,
          placeholder: '例: 4月分 交通費精算',
        },
        {
          fieldKey: 'expense_category',
          label: '経費区分',
          fieldType: FormFieldType.SELECT,
          required: true,
          optionsJson: [
            { label: '交通費', value: '交通費' },
            { label: '会議費', value: '会議費' },
            { label: '備品購入', value: '備品購入' },
            { label: 'その他', value: 'その他' },
          ],
        },
        {
          fieldKey: 'amount',
          label: '金額',
          fieldType: FormFieldType.NUMBER,
          required: true,
          placeholder: '例: 12800',
        },
        {
          fieldKey: 'expense_date',
          label: '利用日',
          fieldType: FormFieldType.DATE,
          required: true,
        },
        {
          fieldKey: 'description',
          label: '申請理由',
          fieldType: FormFieldType.TEXTAREA,
          required: true,
          helpText: '業務との関連が分かるように記載してください。',
        },
      ],
    },
    {
      name: '稟議申請',
      description: '契約、発注、予算利用などの事前承認を申請します。',
      fields: [
        {
          fieldKey: 'request_title',
          label: '稟議タイトル',
          fieldType: FormFieldType.TEXT,
          required: true,
        },
        {
          fieldKey: 'vendor',
          label: '取引先',
          fieldType: FormFieldType.TEXT,
          required: true,
        },
        {
          fieldKey: 'budget',
          label: '予算金額',
          fieldType: FormFieldType.NUMBER,
          required: true,
        },
        {
          fieldKey: 'purpose',
          label: '目的・背景',
          fieldType: FormFieldType.TEXTAREA,
          required: true,
        },
      ],
    },
  ];

  const formRepo = manager.getRepository(FormDefinition);
  const fieldRepo = manager.getRepository(FormField);
  const savedDefinitions: FormDefinition[] = [];

  for (const definition of definitions) {
    const formDefinition = await formRepo.save(
      formRepo.create({
        tenantId,
        groupId,
        name: definition.name,
        description: definition.description,
        status: FormDefinitionStatus.PUBLISHED,
        archivedFromStatus: null,
        createdByUserId,
      }),
    );
    await fieldRepo.save(
      definition.fields.map((field, index) =>
        fieldRepo.create({
          tenantId,
          formDefinitionId: formDefinition.id,
          fieldKey: field.fieldKey,
          label: field.label,
          fieldType: field.fieldType,
          required: field.required,
          placeholder: field.placeholder ?? null,
          helpText: field.helpText ?? null,
          optionsJson: field.optionsJson ?? null,
          sortOrder: index + 1,
        }),
      ),
    );
    savedDefinitions.push(formDefinition);
  }

  return savedDefinitions;
}

async function createFormSetupApplication(
  manager: EntityManager,
  input: {
    approvalFlowId: string;
    createdByUserId: string;
    formDefinition: FormDefinition;
    groupId: string;
    tenantId: string;
  },
) {
  const applicationRepo = manager.getRepository(Application);
  await applicationRepo.save(
    applicationRepo.create({
      tenantId: input.tenantId,
      groupId: input.groupId,
      applicantUserId: input.createdByUserId,
      applicantEmail: 'admin@reviewflow.demo',
      formDefinitionId: input.formDefinition.id,
      approvalFlowId: input.approvalFlowId,
      currentStepOrder: null,
      status: ApplicationStatus.PUBLISHED,
      submittedAt: null,
    }),
  );
}

async function createExpenseApplications(
  manager: EntityManager,
  input: {
    approvalFlow: ApprovalFlow;
    applicantUserId: string;
    financeUserId: string;
    formDefinition: FormDefinition;
    groupId: string;
    managerUserId: string;
    tenantId: string;
  },
) {
  const fieldRepo = manager.getRepository(FormField);
  const fields = await fieldRepo.find({
    where: { formDefinitionId: input.formDefinition.id },
  });
  const fieldByKey = new Map(fields.map((field) => [field.fieldKey, field]));
  const steps = await manager.getRepository(ApprovalStep).find({
    where: { approvalFlowId: input.approvalFlow.id },
    order: { stepOrder: 'ASC' },
  });

  const applications: DemoApplication[] = [
    {
      applicant: 'applicant',
      applicantEmail: 'applicant@reviewflow.demo',
      status: ApplicationStatus.SUBMITTED,
      currentStepOrder: 1,
      submittedAt: daysAgo(1),
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1),
      values: {
        expense_title: '大阪出張 交通費精算',
        expense_category: '交通費',
        amount: 18420,
        expense_date: formatDate(daysAgo(3)),
        description: '顧客定例会議への参加に伴う新幹線往復費用です。',
      },
    },
    {
      applicant: 'applicant',
      applicantEmail: 'applicant@reviewflow.demo',
      status: ApplicationStatus.IN_REVIEW,
      currentStepOrder: 2,
      submittedAt: daysAgo(4),
      createdAt: daysAgo(4),
      updatedAt: daysAgo(2),
      values: {
        expense_title: 'プロジェクト会議費',
        expense_category: '会議費',
        amount: 9600,
        expense_date: formatDate(daysAgo(5)),
        description: '新規導入プロジェクトのキックオフ会議で利用しました。',
      },
    },
    {
      applicant: 'applicant',
      applicantEmail: 'applicant@reviewflow.demo',
      status: ApplicationStatus.RETURNED,
      currentStepOrder: 1,
      submittedAt: daysAgo(7),
      createdAt: daysAgo(7),
      updatedAt: daysAgo(6),
      values: {
        expense_title: '備品購入',
        expense_category: '備品購入',
        amount: 32800,
        expense_date: formatDate(daysAgo(8)),
        description: '開発チーム用のモニターを購入しました。',
      },
    },
    {
      applicant: 'applicant',
      applicantEmail: 'applicant@reviewflow.demo',
      status: ApplicationStatus.APPROVED,
      currentStepOrder: null,
      submittedAt: daysAgo(12),
      createdAt: daysAgo(12),
      updatedAt: daysAgo(9),
      values: {
        expense_title: '展示会参加費',
        expense_category: 'その他',
        amount: 55000,
        expense_date: formatDate(daysAgo(14)),
        description: '業界展示会の参加費です。新規商談獲得を目的としています。',
      },
    },
    {
      applicant: null,
      applicantEmail: 'external.vendor@example.com',
      status: ApplicationStatus.REJECTED,
      currentStepOrder: null,
      submittedAt: daysAgo(18),
      createdAt: daysAgo(18),
      updatedAt: daysAgo(16),
      values: {
        expense_title: '外部参加者 会議費',
        expense_category: '会議費',
        amount: 42000,
        expense_date: formatDate(daysAgo(19)),
        description: '金額根拠が不十分なため再申請予定です。',
      },
    },
  ];

  for (const demoApplication of applications) {
    const saved = await saveApplication(manager, input, demoApplication);
    await saveFieldValues(
      manager,
      input.tenantId,
      saved.id,
      demoApplication.values,
      fieldByKey,
    );
    await saveApprovalHistory(manager, {
      application: saved,
      financeUserId: input.financeUserId,
      managerUserId: input.managerUserId,
      status: demoApplication.status,
      steps,
      tenantId: input.tenantId,
    });
    if (demoApplication.status === ApplicationStatus.RETURNED) {
      await saveCorrectionRequest(manager, {
        applicationId: saved.id,
        requestedByUserId: input.managerUserId,
        tenantId: input.tenantId,
        targetFieldId: fieldByKey.get('description')?.id,
      });
    }
  }
}

async function saveApplication(
  manager: EntityManager,
  input: {
    approvalFlow: ApprovalFlow;
    applicantUserId: string;
    formDefinition: FormDefinition;
    groupId: string;
    tenantId: string;
  },
  demoApplication: DemoApplication,
) {
  const applicationRepo = manager.getRepository(Application);
  const application = await applicationRepo.save(
    applicationRepo.create({
      tenantId: input.tenantId,
      groupId: input.groupId,
      applicantUserId:
        demoApplication.applicant === null ? null : input.applicantUserId,
      applicantEmail: demoApplication.applicantEmail,
      formDefinitionId: input.formDefinition.id,
      approvalFlowId: input.approvalFlow.id,
      currentStepOrder: demoApplication.currentStepOrder,
      status: demoApplication.status,
      submittedAt: demoApplication.submittedAt,
    }),
  );
  await applicationRepo.update(
    { id: application.id },
    {
      createdAt: demoApplication.createdAt,
      updatedAt: demoApplication.updatedAt,
    },
  );
  return applicationRepo.findOneByOrFail({ id: application.id });
}

async function saveFieldValues(
  manager: EntityManager,
  tenantId: string,
  applicationId: string,
  values: Record<string, unknown>,
  fieldByKey: Map<string, FormField>,
) {
  const valueRepo = manager.getRepository(ApplicationFieldValue);
  const rows = Object.entries(values).flatMap(([fieldKey, value]) => {
    const field = fieldByKey.get(fieldKey);
    if (!field) {
      return [];
    }
    return valueRepo.create({
      tenantId,
      applicationId,
      formFieldId: field.id,
      valueJson: value,
    });
  });
  await valueRepo.save(rows);
}

async function saveApprovalHistory(
  manager: EntityManager,
  input: {
    application: Application;
    financeUserId: string;
    managerUserId: string;
    status: (typeof ApplicationStatus)[keyof typeof ApplicationStatus];
    steps: ApprovalStep[];
    tenantId: string;
  },
) {
  const approvalRepo = manager.getRepository(ApplicationApproval);
  const [managerStep, financeStep] = input.steps;
  const rows: ApplicationApproval[] = [];

  if (
    input.status === ApplicationStatus.IN_REVIEW ||
    input.status === ApplicationStatus.APPROVED ||
    input.status === ApplicationStatus.REJECTED
  ) {
    rows.push(
      approvalRepo.create({
        tenantId: input.tenantId,
        applicationId: input.application.id,
        approvalStepId: managerStep.id,
        actedByUserId: input.managerUserId,
        action: ApplicationApprovalAction.APPROVED,
        comment: '内容を確認しました。',
      }),
    );
  }

  if (input.status === ApplicationStatus.APPROVED) {
    rows.push(
      approvalRepo.create({
        tenantId: input.tenantId,
        applicationId: input.application.id,
        approvalStepId: financeStep.id,
        actedByUserId: input.financeUserId,
        action: ApplicationApprovalAction.APPROVED,
        comment: '精算対象として承認します。',
      }),
    );
  }

  if (input.status === ApplicationStatus.REJECTED) {
    rows.push(
      approvalRepo.create({
        tenantId: input.tenantId,
        applicationId: input.application.id,
        approvalStepId: financeStep.id,
        actedByUserId: input.financeUserId,
        action: ApplicationApprovalAction.REJECTED,
        comment: '金額根拠が不足しているため却下します。',
      }),
    );
  }

  await approvalRepo.save(rows);
}

async function saveCorrectionRequest(
  manager: EntityManager,
  input: {
    applicationId: string;
    requestedByUserId: string;
    targetFieldId?: string;
    tenantId: string;
  },
) {
  if (!input.targetFieldId) {
    return;
  }
  const requestRepo = manager.getRepository(CorrectionRequest);
  const itemRepo = manager.getRepository(CorrectionRequestItem);
  const request = await requestRepo.save(
    requestRepo.create({
      tenantId: input.tenantId,
      applicationId: input.applicationId,
      requestedByUserId: input.requestedByUserId,
      status: CorrectionRequestStatus.OPEN,
      overallComment: '申請理由に購入目的と利用部門を追記してください。',
      resolvedAt: null,
    }),
  );
  await itemRepo.save(
    itemRepo.create({
      tenantId: input.tenantId,
      correctionRequestId: request.id,
      formFieldId: input.targetFieldId,
      comment: '備品購入の必要性が分かるように補足してください。',
      isResolved: false,
    }),
  );
}

function daysAgo(days: number): Date {
  const date = new Date();
  date.setHours(10, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date;
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
