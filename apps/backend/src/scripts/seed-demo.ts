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

const DEMO_TENANT_NAME = 'みどり市 申請受付デモ';
const DEMO_PASSWORD = 'Password123!';
const RESET_DEMO_TENANT_NAMES = [DEMO_TENANT_NAME, 'ReviewFlow Demo'];

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
  formName: string;
  status: (typeof ApplicationStatus)[keyof typeof ApplicationStatus];
  submittedAt: Date | null;
  targetFieldKey?: string;
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
      for (const tenantName of RESET_DEMO_TENANT_NAMES) {
        const existingTenant = await tenantRepo.findOne({
          where: { name: tenantName },
        });
        if (existingTenant) {
          await tenantRepo.remove(existingTenant);
        }
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

      await createPublicProcedureApplications(manager, {
        approvalFlow,
        applicantUserId: users.applicant.id,
        financeUserId: users.finance.id,
        formDefinitions,
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
    console.log(`Reviewer: reviewer@reviewflow.demo / ${DEMO_PASSWORD}`);
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
      name: '青木 玲奈',
      email: 'admin@reviewflow.demo',
      passwordHash,
      role: UserRole.TENANT_ADMIN,
      isActive: true,
    }),
    manager: userRepo.create({
      tenantId,
      name: '市民協働課 田中 健',
      email: 'reviewer@reviewflow.demo',
      passwordHash,
      role: UserRole.TENANT_USER,
      isActive: true,
    }),
    finance: userRepo.create({
      tenantId,
      name: '財政課 山本 美咲',
      email: 'finance@reviewflow.demo',
      passwordHash,
      role: UserRole.TENANT_USER,
      isActive: true,
    }),
    applicant: userRepo.create({
      tenantId,
      name: 'みどり商店会 高橋 翔太',
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
      name: '公共申請受付',
      description:
        '補助金、施設利用、イベント開催などの公的申請を扱うデモスペース',
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
      name: '担当課確認・財政確認フロー',
      isActive: true,
    }),
  );
  await stepRepo.save([
    stepRepo.create({
      tenantId,
      groupId,
      approvalFlowId: flow.id,
      stepOrder: 1,
      stepName: '担当課確認',
      assigneeUserId: users.manager.id,
      assigneeUserIds: [users.manager.id],
      canReturn: true,
    }),
    stepRepo.create({
      tenantId,
      groupId,
      approvalFlowId: flow.id,
      stepOrder: 2,
      stepName: '財政確認',
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
      name: '補助金申請',
      description:
        '事業者・住民団体が地域活動や設備導入に関する補助金を申請します。',
      fields: [
        {
          fieldKey: 'applicant_name',
          label: '申請者・団体名',
          fieldType: FormFieldType.TEXT,
          required: true,
          placeholder: '例: みどり商店会',
        },
        {
          fieldKey: 'subsidy_program',
          label: '補助金種別',
          fieldType: FormFieldType.SELECT,
          required: true,
          optionsJson: [
            { label: '地域活動支援', value: '地域活動支援' },
            { label: '商店街活性化', value: '商店街活性化' },
            { label: '省エネ設備導入', value: '省エネ設備導入' },
            { label: 'その他', value: 'その他' },
          ],
        },
        {
          fieldKey: 'project_name',
          label: '事業名',
          fieldType: FormFieldType.TEXT,
          required: true,
          placeholder: '例: 中央通り夜市活性化事業',
        },
        {
          fieldKey: 'requested_amount',
          label: '申請金額',
          fieldType: FormFieldType.NUMBER,
          required: true,
          placeholder: '例: 450000',
        },
        {
          fieldKey: 'project_start_date',
          label: '事業開始予定日',
          fieldType: FormFieldType.DATE,
          required: true,
        },
        {
          fieldKey: 'project_plan',
          label: '事業計画・必要性',
          fieldType: FormFieldType.TEXTAREA,
          required: true,
          helpText: '目的、実施内容、期待効果が分かるように記載してください。',
        },
        {
          fieldKey: 'attachment_check',
          label: '添付書類確認',
          fieldType: FormFieldType.SELECT,
          required: true,
          optionsJson: [
            { label: '見積書・収支計画を添付済み', value: '添付済み' },
            { label: '一部未添付', value: '一部未添付' },
          ],
        },
      ],
    },
    {
      name: '施設利用申請',
      description: '公民館、体育館、会議室などの公共施設利用を申請します。',
      fields: [
        {
          fieldKey: 'applicant_name',
          label: '申請者・団体名',
          fieldType: FormFieldType.TEXT,
          required: true,
        },
        {
          fieldKey: 'facility_name',
          label: '利用施設',
          fieldType: FormFieldType.SELECT,
          required: true,
          optionsJson: [
            { label: '中央公民館 ホール', value: '中央公民館 ホール' },
            { label: '市民体育館', value: '市民体育館' },
            { label: '駅前会議室', value: '駅前会議室' },
          ],
        },
        {
          fieldKey: 'use_date',
          label: '利用日',
          fieldType: FormFieldType.DATE,
          required: true,
        },
        {
          fieldKey: 'participants',
          label: '利用予定人数',
          fieldType: FormFieldType.NUMBER,
          required: true,
        },
        {
          fieldKey: 'purpose',
          label: '利用目的',
          fieldType: FormFieldType.TEXTAREA,
          required: true,
        },
      ],
    },
    {
      name: 'イベント開催申請',
      description:
        '道路使用、公共施設利用、地域イベントなど複数部署確認が必要な申請です。',
      fields: [
        {
          fieldKey: 'organizer_name',
          label: '主催者名',
          fieldType: FormFieldType.TEXT,
          required: true,
        },
        {
          fieldKey: 'event_name',
          label: 'イベント名',
          fieldType: FormFieldType.TEXT,
          required: true,
        },
        {
          fieldKey: 'event_date',
          label: '開催日',
          fieldType: FormFieldType.DATE,
          required: true,
        },
        {
          fieldKey: 'venue',
          label: '会場・使用場所',
          fieldType: FormFieldType.TEXT,
          required: true,
        },
        {
          fieldKey: 'expected_visitors',
          label: '想定来場者数',
          fieldType: FormFieldType.NUMBER,
          required: true,
        },
        {
          fieldKey: 'safety_plan',
          label: '安全対策・運営計画',
          fieldType: FormFieldType.TEXTAREA,
          required: true,
        },
      ],
    },
    {
      name: '事業者登録申請',
      description: '指定業者、委託先、取引先として登録するための確認申請です。',
      fields: [
        {
          fieldKey: 'business_name',
          label: '事業者名',
          fieldType: FormFieldType.TEXT,
          required: true,
        },
        {
          fieldKey: 'representative_name',
          label: '代表者名',
          fieldType: FormFieldType.TEXT,
          required: true,
        },
        {
          fieldKey: 'business_category',
          label: '業種',
          fieldType: FormFieldType.SELECT,
          required: true,
          optionsJson: [
            { label: '建設・設備', value: '建設・設備' },
            { label: '物品販売', value: '物品販売' },
            { label: '業務委託', value: '業務委託' },
            { label: 'その他', value: 'その他' },
          ],
        },
        {
          fieldKey: 'registration_reason',
          label: '登録希望理由',
          fieldType: FormFieldType.TEXTAREA,
          required: true,
        },
        {
          fieldKey: 'documents_status',
          label: '添付書類',
          fieldType: FormFieldType.SELECT,
          required: true,
          optionsJson: [
            { label: '登記簿・納税証明を添付済み', value: '添付済み' },
            { label: '一部未添付', value: '一部未添付' },
          ],
        },
      ],
    },
    {
      name: '各種減免申請',
      description:
        '施設使用料、保育料、税関連などの減免について判断根拠を確認します。',
      fields: [
        {
          fieldKey: 'applicant_name',
          label: '申請者名',
          fieldType: FormFieldType.TEXT,
          required: true,
        },
        {
          fieldKey: 'exemption_type',
          label: '減免種別',
          fieldType: FormFieldType.SELECT,
          required: true,
          optionsJson: [
            { label: '施設使用料', value: '施設使用料' },
            { label: '保育料', value: '保育料' },
            { label: '税関連', value: '税関連' },
          ],
        },
        {
          fieldKey: 'target_amount',
          label: '対象金額',
          fieldType: FormFieldType.NUMBER,
          required: true,
        },
        {
          fieldKey: 'reason',
          label: '減免を希望する理由',
          fieldType: FormFieldType.TEXTAREA,
          required: true,
        },
        {
          fieldKey: 'evidence_summary',
          label: '判断根拠・証明書類',
          fieldType: FormFieldType.TEXTAREA,
          required: true,
        },
      ],
    },
    {
      name: '住民向け手続き',
      description:
        '相談予約、申請受付、証明書関連依頼など住民向け手続きを受け付けます。',
      fields: [
        {
          fieldKey: 'resident_name',
          label: '氏名',
          fieldType: FormFieldType.TEXT,
          required: true,
        },
        {
          fieldKey: 'procedure_type',
          label: '手続き種別',
          fieldType: FormFieldType.SELECT,
          required: true,
          optionsJson: [
            { label: '相談予約', value: '相談予約' },
            { label: '証明書関連依頼', value: '証明書関連依頼' },
            { label: '申請受付相談', value: '申請受付相談' },
          ],
        },
        {
          fieldKey: 'preferred_date',
          label: '希望日',
          fieldType: FormFieldType.DATE,
          required: true,
        },
        {
          fieldKey: 'contact_email',
          label: '連絡先メールアドレス',
          fieldType: FormFieldType.TEXT,
          required: true,
        },
        {
          fieldKey: 'request_detail',
          label: '相談・依頼内容',
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

async function createPublicProcedureApplications(
  manager: EntityManager,
  input: {
    approvalFlow: ApprovalFlow;
    applicantUserId: string;
    financeUserId: string;
    formDefinitions: FormDefinition[];
    groupId: string;
    managerUserId: string;
    tenantId: string;
  },
) {
  const fieldRepo = manager.getRepository(FormField);
  const formDefinitionByName = new Map(
    input.formDefinitions.map((formDefinition) => [
      formDefinition.name,
      formDefinition,
    ]),
  );
  const fieldsByFormName = new Map<string, Map<string, FormField>>();
  for (const formDefinition of input.formDefinitions) {
    const fields = await fieldRepo.find({
      where: { formDefinitionId: formDefinition.id },
    });
    fieldsByFormName.set(
      formDefinition.name,
      new Map(fields.map((field) => [field.fieldKey, field])),
    );
  }
  const steps = await manager.getRepository(ApprovalStep).find({
    where: { approvalFlowId: input.approvalFlow.id },
    order: { stepOrder: 'ASC' },
  });

  const applications: DemoApplication[] = [
    {
      applicant: 'applicant',
      applicantEmail: 'applicant@reviewflow.demo',
      formName: '補助金申請',
      status: ApplicationStatus.SUBMITTED,
      currentStepOrder: 1,
      submittedAt: daysAgo(1),
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1),
      values: {
        applicant_name: 'みどり商店会',
        subsidy_program: '商店街活性化',
        project_name: '中央通り夜市活性化事業',
        requested_amount: 450000,
        project_start_date: formatDate(daysFromNow(30)),
        project_plan:
          '夏季の歩行者回遊を増やすため、夜市の出店管理と広報を実施します。',
        attachment_check: '添付済み',
      },
    },
    {
      applicant: 'applicant',
      applicantEmail: 'applicant@reviewflow.demo',
      formName: '施設利用申請',
      status: ApplicationStatus.IN_REVIEW,
      currentStepOrder: 2,
      submittedAt: daysAgo(4),
      createdAt: daysAgo(4),
      updatedAt: daysAgo(2),
      values: {
        applicant_name: '青葉町自治会',
        facility_name: '中央公民館 ホール',
        use_date: formatDate(daysFromNow(18)),
        participants: 80,
        purpose: '防災講習会と地域交流会を同日開催します。',
      },
    },
    {
      applicant: 'applicant',
      applicantEmail: 'applicant@reviewflow.demo',
      formName: 'イベント開催申請',
      status: ApplicationStatus.RETURNED,
      currentStepOrder: 1,
      submittedAt: daysAgo(7),
      createdAt: daysAgo(7),
      updatedAt: daysAgo(6),
      targetFieldKey: 'safety_plan',
      values: {
        organizer_name: 'みどり駅前実行委員会',
        event_name: '駅前ストリートフェスタ',
        event_date: formatDate(daysFromNow(45)),
        venue: 'みどり駅前広場・中央通り歩道',
        expected_visitors: 1200,
        safety_plan: '警備担当を配置し、混雑時はスタッフが歩行者を誘導します。',
      },
    },
    {
      applicant: 'applicant',
      applicantEmail: 'applicant@reviewflow.demo',
      formName: '事業者登録申請',
      status: ApplicationStatus.APPROVED,
      currentStepOrder: null,
      submittedAt: daysAgo(12),
      createdAt: daysAgo(12),
      updatedAt: daysAgo(9),
      values: {
        business_name: '株式会社グリーン設備',
        representative_name: '森下 一郎',
        business_category: '建設・設備',
        registration_reason:
          '公共施設の省エネ改修案件に対応する指定業者として登録を希望します。',
        documents_status: '添付済み',
      },
    },
    {
      applicant: null,
      applicantEmail: 'resident@example.com',
      status: ApplicationStatus.REJECTED,
      currentStepOrder: null,
      submittedAt: daysAgo(18),
      createdAt: daysAgo(18),
      updatedAt: daysAgo(16),
      formName: '各種減免申請',
      values: {
        applicant_name: '鈴木 花子',
        exemption_type: '施設使用料',
        target_amount: 32000,
        reason: '地域活動に関する利用のため全額減免を希望します。',
        evidence_summary:
          '団体活動の実績資料が未提出で、減免対象要件の確認ができません。',
      },
    },
    {
      applicant: null,
      applicantEmail: 'resident-consultation@example.com',
      formName: '住民向け手続き',
      status: ApplicationStatus.SUBMITTED,
      currentStepOrder: 1,
      submittedAt: daysAgo(2),
      createdAt: daysAgo(2),
      updatedAt: daysAgo(2),
      values: {
        resident_name: '中村 大輔',
        procedure_type: '相談予約',
        preferred_date: formatDate(daysFromNow(7)),
        contact_email: 'resident-consultation@example.com',
        request_detail:
          '地域活動支援金の対象経費と申請前相談の日程を確認したいです。',
      },
    },
  ];

  for (const demoApplication of applications) {
    const formDefinition = formDefinitionByName.get(demoApplication.formName);
    const fieldByKey = fieldsByFormName.get(demoApplication.formName);
    if (!formDefinition || !fieldByKey) {
      continue;
    }
    const saved = await saveApplication(
      manager,
      {
        ...input,
        formDefinition,
      },
      demoApplication,
    );
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
        targetFieldId: fieldByKey.get(demoApplication.targetFieldKey ?? '')?.id,
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
        comment: '申請内容と必要項目を確認しました。',
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
        comment: '予算・添付書類を確認し、承認します。',
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
        comment: '判断根拠が不足しているため却下します。',
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
      overallComment: '安全対策と関係部署への事前確認状況を追記してください。',
      resolvedAt: null,
    }),
  );
  await itemRepo.save(
    itemRepo.create({
      tenantId: input.tenantId,
      correctionRequestId: request.id,
      formFieldId: input.targetFieldId,
      comment:
        '来場者誘導、緊急時連絡先、道路使用時の安全管理を補足してください。',
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

function daysFromNow(days: number): Date {
  const date = new Date();
  date.setHours(10, 0, 0, 0);
  date.setDate(date.getDate() + days);
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
