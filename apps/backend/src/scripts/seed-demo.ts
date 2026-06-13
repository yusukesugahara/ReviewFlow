import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { DataSource, EntityManager, type DataSourceOptions } from 'typeorm';
import { buildTypeOrmOptions } from '../app/typeorm-options.factory';
import { ApplicationApprovalAction } from '../models/constants/application-approval-action';
import { ApplicationStatus } from '../models/constants/application-status';
import { CorrectionRequestStatus } from '../models/constants/correction-request-status';
import {
  FormDefinitionStatus,
  type FormDefinitionStatusValue,
} from '../models/constants/form-definition-status';
import { FormFieldType } from '../models/constants/form-field-type';
import { GroupMemberRole } from '../models/constants/group-member-role';
import { TenantPlan, TenantStatus } from '../models/constants/tenant-enums';
import { UserRole } from '../models/constants/user-role';
import { ApplicationApproval } from '../models/entities/application-approval.entity';
import { ApplicationFieldValue } from '../models/entities/application-field-value.entity';
import { Application } from '../models/entities/application.entity';
import { ApprovalFlow } from '../models/entities/approval-flow.entity';
import { ApprovalStep } from '../models/entities/approval-step.entity';
import {
  AuditLog,
  type AuditActorType,
} from '../models/entities/audit-log.entity';
import { CorrectionRequestItem } from '../models/entities/correction-request-item.entity';
import { CorrectionRequest } from '../models/entities/correction-request.entity';
import { FormDefinition } from '../models/entities/form-definition.entity';
import { FormField } from '../models/entities/form-field.entity';
import { GroupMember } from '../models/entities/group-member.entity';
import { Group } from '../models/entities/group.entity';
import { Tenant } from '../models/entities/tenant.entity';
import { User } from '../models/entities/user.entity';
import { BusinessAuditAction } from '../app/modules/audit-logs/services/business-audit-log.service';
import type { ApplicationStatusValue } from '../models/constants/application-status';
import type { GroupMemberRoleValue } from '../models/constants/group-member-role';
import type { UserRoleValue } from '../models/constants/user-role';

const DEMO_TENANT_NAME = 'みどり市 申請受付デモ';
const DEMO_PASSWORD = 'Password123!';
const RESET_DATABASE =
  process.env.SEED_RESET_DATABASE === undefined ||
  process.env.SEED_RESET_DATABASE !== 'false';
const RESET_DEMO_TENANT_NAMES = [DEMO_TENANT_NAME, 'ReviewFlow Demo'];

type DemoUserKey =
  | 'admin'
  | 'citizenApprover'
  | 'citizenOperator'
  | 'citizenReviewer'
  | 'roadApprover'
  | 'roadInspector'
  | 'roadReviewer';

type DemoFormDefinition = {
  archivedFromStatus?: FormDefinitionStatusValue | null;
  createSetupApplication?: boolean;
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
  status?: FormDefinitionStatusValue;
};

type DemoApplication = {
  applicantEmail: string;
  correction?: {
    itemComment: string;
    overallComment: string;
  };
  createdAt: Date;
  currentStepOrder: number | null;
  formName: string;
  status: (typeof ApplicationStatus)[keyof typeof ApplicationStatus];
  submittedAt: Date | null;
  targetFieldKey?: string;
  updatedAt: Date;
  values: Record<string, unknown>;
};

type DemoSpace = {
  applications: DemoApplication[];
  approverUserKey: DemoUserKey;
  description: string;
  flowName: string;
  formDefinitions: DemoFormDefinition[];
  memberUserKeys: DemoUserKey[];
  name: string;
  reviewerUserKey: DemoUserKey;
  stepNames: [string, string];
};

type SeededSpace = {
  applications: Application[];
  demoSpace: DemoSpace;
  formDefinitions: FormDefinition[];
  group: Group;
};

type SeededFormDefinition = {
  demoDefinition: DemoFormDefinition;
  formDefinition: FormDefinition;
};

const DEMO_SPACES: DemoSpace[] = [
  {
    name: '市民課',
    approverUserKey: 'citizenApprover',
    description:
      '住民票、戸籍、マイナンバー、窓口相談など市民向け手続きを扱うデモスペース',
    flowName: '市民課 受付確認・係長決裁フロー',
    stepNames: ['窓口担当確認', '係長決裁'],
    formDefinitions: [
      {
        name: '住民票写し交付申請',
        description: '住民票の写しや記載事項証明書の交付を受け付けます。',
        fields: [
          {
            fieldKey: 'applicant_name',
            label: '申請者氏名',
            fieldType: FormFieldType.TEXT,
            required: true,
            placeholder: '例: 佐藤 一郎',
          },
          {
            fieldKey: 'certificate_type',
            label: '証明書種別',
            fieldType: FormFieldType.SELECT,
            required: true,
            optionsJson: [
              { label: '住民票の写し', value: '住民票の写し' },
              { label: '住民票記載事項証明書', value: '住民票記載事項証明書' },
              { label: '除票の写し', value: '除票の写し' },
            ],
          },
          {
            fieldKey: 'copies',
            label: '必要通数',
            fieldType: FormFieldType.NUMBER,
            required: true,
            placeholder: '例: 2',
          },
          {
            fieldKey: 'purpose',
            label: '使用目的',
            fieldType: FormFieldType.TEXTAREA,
            required: true,
          },
          {
            fieldKey: 'pickup_date',
            label: '受取希望日',
            fieldType: FormFieldType.DATE,
            required: true,
          },
        ],
      },
      {
        name: 'マイナンバーカード窓口予約',
        description: 'カード交付、電子証明書更新、暗証番号再設定の予約です。',
        fields: [
          {
            fieldKey: 'resident_name',
            label: '予約者氏名',
            fieldType: FormFieldType.TEXT,
            required: true,
          },
          {
            fieldKey: 'procedure_type',
            label: '手続き内容',
            fieldType: FormFieldType.SELECT,
            required: true,
            optionsJson: [
              { label: 'カード交付', value: 'カード交付' },
              { label: '電子証明書更新', value: '電子証明書更新' },
              { label: '暗証番号再設定', value: '暗証番号再設定' },
            ],
          },
          {
            fieldKey: 'preferred_date',
            label: '来庁希望日',
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
            fieldKey: 'notes',
            label: '連絡事項',
            fieldType: FormFieldType.TEXTAREA,
            required: false,
          },
        ],
      },
      {
        name: '転入届 事前確認（下書き）',
        description:
          '転入手続きの事前確認フォーム。公開前の下書きとして編集できます。',
        status: FormDefinitionStatus.DRAFT,
        fields: [
          {
            fieldKey: 'moving_person_name',
            label: '転入者氏名',
            fieldType: FormFieldType.TEXT,
            required: true,
            placeholder: '例: 中村 友香',
          },
          {
            fieldKey: 'previous_address',
            label: '前住所',
            fieldType: FormFieldType.TEXTAREA,
            required: true,
          },
          {
            fieldKey: 'moving_date',
            label: '転入予定日',
            fieldType: FormFieldType.DATE,
            required: true,
          },
        ],
      },
    ],
    memberUserKeys: ['citizenReviewer', 'citizenApprover', 'citizenOperator'],
    reviewerUserKey: 'citizenReviewer',
    applications: [
      {
        applicantEmail: 'sato@example.com',
        formName: '住民票写し交付申請',
        status: ApplicationStatus.IN_REVIEW,
        currentStepOrder: 1,
        submittedAt: daysAgo(1),
        createdAt: daysAgo(1),
        updatedAt: daysAgo(1),
        values: {
          applicant_name: '佐藤 一郎',
          certificate_type: '住民票の写し',
          copies: 2,
          purpose: '勤務先への住所確認書類として提出するため。',
          pickup_date: formatDate(daysFromNow(3)),
        },
      },
      {
        applicantEmail: 'yamada@example.com',
        formName: 'マイナンバーカード窓口予約',
        status: ApplicationStatus.RETURNED,
        currentStepOrder: null,
        submittedAt: daysAgo(5),
        createdAt: daysAgo(5),
        updatedAt: daysAgo(4),
        targetFieldKey: 'procedure_type',
        correction: {
          overallComment:
            '来庁目的と手続き内容を確認できるよう、手続き内容を選び直してください。',
          itemComment:
            'カード交付、電子証明書更新、暗証番号再設定のどれに該当するかを確認してください。',
        },
        values: {
          resident_name: '山田 花子',
          procedure_type: 'カード交付',
          preferred_date: formatDate(daysFromNow(6)),
          contact_email: 'yamada@example.com',
          notes: '本人確認書類について確認したいです。',
        },
      },
      {
        applicantEmail: 'takahashi@example.com',
        formName: '住民票写し交付申請',
        status: ApplicationStatus.APPROVED,
        currentStepOrder: null,
        submittedAt: daysAgo(10),
        createdAt: daysAgo(10),
        updatedAt: daysAgo(8),
        values: {
          applicant_name: '高橋 翔太',
          certificate_type: '住民票記載事項証明書',
          copies: 1,
          purpose: '資格登録の添付書類として使用。',
          pickup_date: formatDate(daysAgo(7)),
        },
      },
      {
        applicantEmail: 'kato@example.com',
        formName: 'マイナンバーカード窓口予約',
        status: ApplicationStatus.IN_REVIEW,
        currentStepOrder: 2,
        submittedAt: daysAgo(3),
        createdAt: daysAgo(3),
        updatedAt: daysAgo(2),
        values: {
          resident_name: '加藤 真由',
          procedure_type: '電子証明書更新',
          preferred_date: formatDate(daysFromNow(5)),
          contact_email: 'kato@example.com',
          notes: '仕事の都合で午前中の予約を希望します。',
        },
      },
      {
        applicantEmail: 'ito@example.com',
        formName: '住民票写し交付申請',
        status: ApplicationStatus.REJECTED,
        currentStepOrder: null,
        submittedAt: daysAgo(14),
        createdAt: daysAgo(14),
        updatedAt: daysAgo(12),
        values: {
          applicant_name: '伊藤 直樹',
          certificate_type: '除票の写し',
          copies: 1,
          purpose: '第三者請求の疎明資料が不足している状態で申請。',
          pickup_date: formatDate(daysAgo(10)),
        },
      },
    ],
  },
  {
    name: '道路公園課',
    approverUserKey: 'roadApprover',
    description:
      '道路占用、公園利用、街路樹・公園設備に関する申請を扱うデモスペース',
    flowName: '道路公園課 現地確認・課長決裁フロー',
    stepNames: ['担当者現地確認', '課長決裁'],
    formDefinitions: [
      {
        name: '道路占用許可申請',
        description: '工事、足場、看板など道路区域の一時占用を申請します。',
        fields: [
          {
            fieldKey: 'contractor_name',
            label: '申請者・施工業者名',
            fieldType: FormFieldType.TEXT,
            required: true,
          },
          {
            fieldKey: 'location',
            label: '占用場所',
            fieldType: FormFieldType.TEXT,
            required: true,
            placeholder: '例: みどり市中央1-2先 市道12号線',
          },
          {
            fieldKey: 'occupation_type',
            label: '占用種別',
            fieldType: FormFieldType.SELECT,
            required: true,
            optionsJson: [
              { label: '足場設置', value: '足場設置' },
              { label: '工事車両停車', value: '工事車両停車' },
              { label: '仮設看板', value: '仮設看板' },
            ],
          },
          {
            fieldKey: 'start_date',
            label: '開始日',
            fieldType: FormFieldType.DATE,
            required: true,
          },
          {
            fieldKey: 'end_date',
            label: '終了日',
            fieldType: FormFieldType.DATE,
            required: true,
          },
          {
            fieldKey: 'traffic_safety_plan',
            label: '交通安全対策',
            fieldType: FormFieldType.TEXTAREA,
            required: true,
          },
        ],
      },
      {
        name: '公園利用届',
        description: '地域行事、清掃活動、撮影など公園利用の届出です。',
        fields: [
          {
            fieldKey: 'organizer_name',
            label: '団体名・代表者名',
            fieldType: FormFieldType.TEXT,
            required: true,
          },
          {
            fieldKey: 'park_name',
            label: '利用公園',
            fieldType: FormFieldType.SELECT,
            required: true,
            optionsJson: [
              { label: '中央公園', value: '中央公園' },
              { label: '桜川公園', value: '桜川公園' },
              { label: '駅前広場', value: '駅前広場' },
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
            label: '参加予定人数',
            fieldType: FormFieldType.NUMBER,
            required: true,
          },
          {
            fieldKey: 'activity_detail',
            label: '利用内容',
            fieldType: FormFieldType.TEXTAREA,
            required: true,
          },
        ],
      },
      {
        name: '緑化活動助成金申請（旧様式）',
        description:
          '過年度の助成制度で利用していた旧様式。削除済みフォームの復元確認用です。',
        status: FormDefinitionStatus.ARCHIVED,
        archivedFromStatus: FormDefinitionStatus.PUBLISHED,
        fields: [
          {
            fieldKey: 'organization_name',
            label: '団体名',
            fieldType: FormFieldType.TEXT,
            required: true,
          },
          {
            fieldKey: 'activity_area',
            label: '活動場所',
            fieldType: FormFieldType.TEXT,
            required: true,
          },
          {
            fieldKey: 'budget_amount',
            label: '申請金額',
            fieldType: FormFieldType.NUMBER,
            required: true,
          },
          {
            fieldKey: 'activity_plan',
            label: '活動計画',
            fieldType: FormFieldType.TEXTAREA,
            required: true,
          },
        ],
      },
    ],
    memberUserKeys: ['roadReviewer', 'roadApprover', 'roadInspector'],
    reviewerUserKey: 'roadReviewer',
    applications: [
      {
        applicantEmail: 'green-setsubi@example.com',
        formName: '道路占用許可申請',
        status: ApplicationStatus.IN_REVIEW,
        currentStepOrder: 2,
        submittedAt: daysAgo(4),
        createdAt: daysAgo(4),
        updatedAt: daysAgo(2),
        values: {
          contractor_name: '株式会社グリーン設備',
          location: 'みどり市中央2-4先 市道8号線',
          occupation_type: '足場設置',
          start_date: formatDate(daysFromNow(14)),
          end_date: formatDate(daysFromNow(21)),
          traffic_safety_plan:
            '歩行者通路を1.5m以上確保し、誘導員を午前8時から午後6時まで配置します。',
        },
      },
      {
        applicantEmail: 'aoba-jichikai@example.com',
        formName: '公園利用届',
        status: ApplicationStatus.APPROVED,
        currentStepOrder: null,
        submittedAt: daysAgo(12),
        createdAt: daysAgo(12),
        updatedAt: daysAgo(9),
        values: {
          organizer_name: '青葉町自治会',
          park_name: '中央公園',
          use_date: formatDate(daysFromNow(10)),
          participants: 45,
          activity_detail: '地域清掃活動と花壇の植え替えを実施します。',
        },
      },
      {
        applicantEmail: 'event@example.com',
        formName: '公園利用届',
        status: ApplicationStatus.REJECTED,
        currentStepOrder: null,
        submittedAt: daysAgo(15),
        createdAt: daysAgo(15),
        updatedAt: daysAgo(13),
        values: {
          organizer_name: '駅前マルシェ実行委員会',
          park_name: '駅前広場',
          use_date: formatDate(daysFromNow(20)),
          participants: 300,
          activity_detail:
            '物販を含む大規模イベントを予定。搬入車両の動線は未定です。',
        },
      },
      {
        applicantEmail: 'koji@example.com',
        formName: '道路占用許可申請',
        status: ApplicationStatus.RETURNED,
        currentStepOrder: null,
        submittedAt: daysAgo(6),
        createdAt: daysAgo(6),
        updatedAt: daysAgo(5),
        targetFieldKey: 'traffic_safety_plan',
        correction: {
          overallComment:
            '安全対策と関係部署への事前確認状況を追記してください。',
          itemComment:
            '来場者誘導、緊急時連絡先、道路使用時の安全管理を補足してください。',
        },
        values: {
          contractor_name: 'みどり建設株式会社',
          location: 'みどり市本町3-1先',
          occupation_type: '工事車両停車',
          start_date: formatDate(daysFromNow(9)),
          end_date: formatDate(daysFromNow(11)),
          traffic_safety_plan: 'カラーコーンを設置します。',
        },
      },
      {
        applicantEmail: 'sakura-clean@example.com',
        formName: '公園利用届',
        status: ApplicationStatus.IN_REVIEW,
        currentStepOrder: 1,
        submittedAt: daysAgo(1),
        createdAt: daysAgo(1),
        updatedAt: daysAgo(1),
        values: {
          organizer_name: '桜川清掃ボランティア',
          park_name: '桜川公園',
          use_date: formatDate(daysFromNow(12)),
          participants: 28,
          activity_detail: '公園内の清掃と落ち葉回収を実施します。',
        },
      },
    ],
  },
];

async function main() {
  configureSeedEnv();
  const config = new ConfigService(process.env);
  const dataSourceOptions = buildTypeOrmOptions(config) as DataSourceOptions;
  if (RESET_DATABASE) {
    await resetDatabase(dataSourceOptions);
  }

  const dataSource = new DataSource(dataSourceOptions);
  await dataSource.initialize();

  try {
    const result = await dataSource.transaction(async (manager) => {
      const tenantRepo = manager.getRepository(Tenant);
      if (!RESET_DATABASE) {
        for (const tenantName of RESET_DEMO_TENANT_NAMES) {
          const existingTenant = await tenantRepo.findOne({
            where: { name: tenantName },
          });
          if (existingTenant) {
            await tenantRepo.remove(existingTenant);
          }
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
      const spaceIds: Array<{ id: string; name: string }> = [];
      const seededSpaces: SeededSpace[] = [];

      for (const demoSpace of DEMO_SPACES) {
        const group = await createGroup(manager, tenant.id, users, demoSpace);
        spaceIds.push({ id: group.id, name: group.name });
        await createGroupMembers(
          manager,
          tenant.id,
          group.id,
          users,
          demoSpace,
        );
        const approvalFlow = await createApprovalFlow(
          manager,
          tenant.id,
          group.id,
          users,
          demoSpace,
        );
        const seededDefinitions = await createFormDefinitions(
          manager,
          tenant.id,
          group.id,
          users.admin.id,
          demoSpace.formDefinitions,
        );
        const formDefinitions = seededDefinitions.map(
          (seededDefinition) => seededDefinition.formDefinition,
        );

        for (const seededDefinition of seededDefinitions) {
          if (
            seededDefinition.demoDefinition.createSetupApplication === false
          ) {
            continue;
          }
          await createFormSetupApplication(manager, {
            approvalFlowId: approvalFlow.id,
            createdByUserId: users.admin.id,
            demoDefinition: seededDefinition.demoDefinition,
            formDefinition: seededDefinition.formDefinition,
            groupId: group.id,
            tenantId: tenant.id,
          });
        }

        const applications = await createPublicProcedureApplications(manager, {
          applications: demoSpace.applications,
          approvalFlow,
          financeUserId: users[demoSpace.approverUserKey].id,
          formDefinitions,
          groupId: group.id,
          managerUserId: users[demoSpace.reviewerUserKey].id,
          tenantId: tenant.id,
        });

        seededSpaces.push({
          applications,
          demoSpace,
          formDefinitions,
          group,
        });
      }

      await createDemoAuditLogs(manager, tenant.id, users, seededSpaces);

      return {
        spaceIds,
        tenantId: tenant.id,
      };
    });

    console.log('Demo seed completed.');
    console.log(
      RESET_DATABASE
        ? 'Database tables were reset before seeding.'
        : 'Existing demo tenant was replaced before seeding.',
    );
    console.log(`Tenant: ${DEMO_TENANT_NAME} (${result.tenantId})`);
    for (const space of result.spaceIds) {
      console.log(`Space: ${space.name} (${space.id})`);
    }
    console.log(`Admin: admin@reviewflow.demo / ${DEMO_PASSWORD}`);
    console.log(
      `Citizen reviewer: citizen-reviewer@reviewflow.demo / ${DEMO_PASSWORD}`,
    );
    console.log(
      `Citizen approver: citizen-approver@reviewflow.demo / ${DEMO_PASSWORD}`,
    );
    console.log(
      `Citizen operator: citizen-operator@reviewflow.demo / ${DEMO_PASSWORD}`,
    );
    console.log(
      `Road reviewer: road-reviewer@reviewflow.demo / ${DEMO_PASSWORD}`,
    );
    console.log(
      `Road approver: road-approver@reviewflow.demo / ${DEMO_PASSWORD}`,
    );
    console.log(
      `Road inspector: road-inspector@reviewflow.demo / ${DEMO_PASSWORD}`,
    );
  } finally {
    await dataSource.destroy();
  }
}

function configureSeedEnv(): void {
  process.env.NODE_ENV ??= 'development';
  process.env.DB_SYNCHRONIZE ??= 'true';

  if (process.env.DATABASE_URL?.length) {
    return;
  }

  process.env.DB_HOST ??= '127.0.0.1';
  process.env.DB_PORT ??= '5432';
  process.env.DB_USERNAME ??= 'app';
  process.env.DB_PASSWORD ??= 'app';
  process.env.DB_NAME ??= 'app_dev';
}

async function resetDatabase(options: DataSourceOptions): Promise<void> {
  const resetDataSource = new DataSource({
    ...options,
    migrationsRun: false,
    synchronize: false,
  });
  await resetDataSource.initialize();
  try {
    const rows = await resetDataSource.query<{ tablename: string }[]>(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename <> 'migrations'
    `);
    if (rows.length === 0) {
      return;
    }

    const tables = rows
      .map(({ tablename }) => `"public"."${tablename.replaceAll('"', '""')}"`)
      .join(', ');
    await resetDataSource.query(
      `TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`,
    );
  } finally {
    await resetDataSource.destroy();
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
    citizenReviewer: userRepo.create({
      tenantId,
      name: '市民課 窓口担当 田中 健',
      email: 'citizen-reviewer@reviewflow.demo',
      passwordHash,
      role: UserRole.TENANT_USER,
      isActive: true,
    }),
    citizenApprover: userRepo.create({
      tenantId,
      name: '市民課 係長 山本 美咲',
      email: 'citizen-approver@reviewflow.demo',
      passwordHash,
      role: UserRole.TENANT_USER,
      isActive: true,
    }),
    citizenOperator: userRepo.create({
      tenantId,
      name: '市民課 窓口担当 鈴木 花',
      email: 'citizen-operator@reviewflow.demo',
      passwordHash,
      role: UserRole.TENANT_USER,
      isActive: true,
    }),
    roadReviewer: userRepo.create({
      tenantId,
      name: '道路公園課 担当者 佐々木 真',
      email: 'road-reviewer@reviewflow.demo',
      passwordHash,
      role: UserRole.TENANT_USER,
      isActive: true,
    }),
    roadApprover: userRepo.create({
      tenantId,
      name: '道路公園課 課長 伊藤 直子',
      email: 'road-approver@reviewflow.demo',
      passwordHash,
      role: UserRole.TENANT_USER,
      isActive: true,
    }),
    roadInspector: userRepo.create({
      tenantId,
      name: '道路公園課 現地確認担当 渡辺 誠',
      email: 'road-inspector@reviewflow.demo',
      passwordHash,
      role: UserRole.TENANT_USER,
      isActive: true,
    }),
  };

  return {
    admin: await userRepo.save(rows.admin),
    citizenApprover: await userRepo.save(rows.citizenApprover),
    citizenOperator: await userRepo.save(rows.citizenOperator),
    citizenReviewer: await userRepo.save(rows.citizenReviewer),
    roadApprover: await userRepo.save(rows.roadApprover),
    roadInspector: await userRepo.save(rows.roadInspector),
    roadReviewer: await userRepo.save(rows.roadReviewer),
  };
}

async function createGroup(
  manager: EntityManager,
  tenantId: string,
  users: Record<DemoUserKey, User>,
  demoSpace: DemoSpace,
): Promise<Group> {
  const groupRepo = manager.getRepository(Group);
  return groupRepo.save(
    groupRepo.create({
      tenantId,
      name: demoSpace.name,
      description: demoSpace.description,
      createdByUserId: users.admin.id,
    }),
  );
}

async function createGroupMembers(
  manager: EntityManager,
  tenantId: string,
  groupId: string,
  users: Record<DemoUserKey, User>,
  demoSpace: DemoSpace,
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
    ...demoSpace.memberUserKeys.map((userKey) =>
      memberRepo.create({
        tenantId,
        groupId,
        userId: users[userKey].id,
        role: GroupMemberRole.USER,
        invitedByUserId: users.admin.id,
      }),
    ),
  ]);
}

async function createApprovalFlow(
  manager: EntityManager,
  tenantId: string,
  groupId: string,
  users: Record<DemoUserKey, User>,
  demoSpace: DemoSpace,
): Promise<ApprovalFlow> {
  const flowRepo = manager.getRepository(ApprovalFlow);
  const stepRepo = manager.getRepository(ApprovalStep);
  const flow = await flowRepo.save(
    flowRepo.create({
      tenantId,
      groupId,
      name: demoSpace.flowName,
      isActive: true,
    }),
  );
  await stepRepo.save([
    stepRepo.create({
      tenantId,
      groupId,
      approvalFlowId: flow.id,
      stepOrder: 1,
      stepName: demoSpace.stepNames[0],
      assigneeUserId: users[demoSpace.reviewerUserKey].id,
      assigneeUserIds: [users[demoSpace.reviewerUserKey].id],
      canReturn: true,
    }),
    stepRepo.create({
      tenantId,
      groupId,
      approvalFlowId: flow.id,
      stepOrder: 2,
      stepName: demoSpace.stepNames[1],
      assigneeUserId: users[demoSpace.approverUserKey].id,
      assigneeUserIds: [users[demoSpace.approverUserKey].id],
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
  definitions: DemoFormDefinition[],
): Promise<SeededFormDefinition[]> {
  const formRepo = manager.getRepository(FormDefinition);
  const fieldRepo = manager.getRepository(FormField);
  const savedDefinitions: SeededFormDefinition[] = [];

  for (const definition of definitions) {
    const formDefinition = await formRepo.save(
      formRepo.create({
        tenantId,
        groupId,
        name: definition.name,
        description: definition.description,
        status: definition.status ?? FormDefinitionStatus.PUBLISHED,
        archivedFromStatus: definition.archivedFromStatus ?? null,
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
    savedDefinitions.push({ demoDefinition: definition, formDefinition });
  }

  return savedDefinitions;
}

async function createFormSetupApplication(
  manager: EntityManager,
  input: {
    approvalFlowId: string;
    createdByUserId: string;
    demoDefinition: DemoFormDefinition;
    formDefinition: FormDefinition;
    groupId: string;
    tenantId: string;
  },
): Promise<Application> {
  const applicationRepo = manager.getRepository(Application);
  return applicationRepo.save(
    applicationRepo.create({
      tenantId: input.tenantId,
      groupId: input.groupId,
      applicantUserId: input.createdByUserId,
      applicantEmail: 'admin@reviewflow.demo',
      formDefinitionId: input.formDefinition.id,
      approvalFlowId: input.approvalFlowId,
      currentStepOrder: null,
      status: setupApplicationStatus(input.demoDefinition),
      submittedAt: null,
    }),
  );
}

async function createPublicProcedureApplications(
  manager: EntityManager,
  input: {
    applications: DemoApplication[];
    approvalFlow: ApprovalFlow;
    financeUserId: string;
    formDefinitions: FormDefinition[];
    groupId: string;
    managerUserId: string;
    tenantId: string;
  },
): Promise<Application[]> {
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
  const savedApplications: Application[] = [];

  for (const demoApplication of input.applications) {
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
        itemComment: demoApplication.correction?.itemComment,
        overallComment: demoApplication.correction?.overallComment,
        requestedByUserId: input.managerUserId,
        tenantId: input.tenantId,
        targetFieldId: fieldByKey.get(demoApplication.targetFieldKey ?? '')?.id,
      });
    }
    savedApplications.push(saved);
  }
  return savedApplications;
}

async function saveApplication(
  manager: EntityManager,
  input: {
    approvalFlow: ApprovalFlow;
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
      applicantUserId: null,
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
  const managerStepAlreadyApproved =
    input.status === ApplicationStatus.APPROVED ||
    input.status === ApplicationStatus.REJECTED ||
    (input.status === ApplicationStatus.IN_REVIEW &&
      input.application.currentStepOrder !== null &&
      input.application.currentStepOrder > 1);

  if (managerStepAlreadyApproved) {
    rows.push(
      approvalRepo.create({
        tenantId: input.tenantId,
        applicationId: input.application.id,
        approvalStepId: managerStep.id,
        actedByUserId: input.managerUserId,
        action: ApplicationApprovalAction.APPROVED,
        comment: '申請内容、本人確認、必要項目を確認しました。',
      }),
    );
  }

  if (input.status === ApplicationStatus.RETURNED) {
    rows.push(
      approvalRepo.create({
        tenantId: input.tenantId,
        applicationId: input.application.id,
        approvalStepId: managerStep.id,
        actedByUserId: input.managerUserId,
        action: ApplicationApprovalAction.RETURNED,
        comment: '確認に必要な情報が不足しているため差し戻します。',
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
        comment: '担当確認結果と添付情報を確認し、承認します。',
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
        comment: '利用条件と安全管理の確認が不足しているため却下します。',
      }),
    );
  }

  await approvalRepo.save(rows);
}

async function saveCorrectionRequest(
  manager: EntityManager,
  input: {
    applicationId: string;
    itemComment?: string;
    overallComment?: string;
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
      overallComment:
        input.overallComment ??
        '確認に必要な情報が不足しているため、内容を補足してください。',
      resolvedAt: null,
    }),
  );
  await itemRepo.save(
    itemRepo.create({
      tenantId: input.tenantId,
      correctionRequestId: request.id,
      formFieldId: input.targetFieldId,
      comment:
        input.itemComment ??
        '確認できなかった内容を追記し、再提出してください。',
      isResolved: false,
    }),
  );
}

function setupApplicationStatus(
  definition: DemoFormDefinition,
): (typeof ApplicationStatus)['DRAFT' | 'PUBLISHED'] {
  if (
    definition.status === FormDefinitionStatus.DRAFT ||
    (definition.status === FormDefinitionStatus.ARCHIVED &&
      definition.archivedFromStatus === FormDefinitionStatus.DRAFT)
  ) {
    return ApplicationStatus.DRAFT;
  }
  return ApplicationStatus.PUBLISHED;
}

async function createDemoAuditLogs(
  manager: EntityManager,
  tenantId: string,
  users: Record<DemoUserKey, User>,
  spaces: SeededSpace[],
) {
  const auditRepo = manager.getRepository(AuditLog);
  const memberRepo = manager.getRepository(GroupMember);
  const rows: DemoAuditLogRow[] = [];

  for (const space of spaces) {
    rows.push({
      actionType: BusinessAuditAction.SPACE_CREATED,
      actorEmailSnapshot: users.admin.email,
      actorType: 'user',
      actorUserId: users.admin.id,
      createdAt: daysAgo(14),
      groupId: space.group.id,
      metadataJson: {
        groupName: space.group.name,
      },
      summary: `${users.admin.email} が ${space.group.name} を作成しました`,
      targetId: space.group.id,
      targetType: 'space',
      tenantId,
    });

    const reviewerMember = await memberRepo.findOneBy({
      groupId: space.group.id,
      tenantId,
      userId: users[space.demoSpace.reviewerUserKey].id,
    });
    if (reviewerMember) {
      rows.push({
        actionType: BusinessAuditAction.SPACE_MEMBER_ADDED,
        actorEmailSnapshot: users.admin.email,
        actorType: 'user',
        actorUserId: users.admin.id,
        createdAt: daysAgo(14),
        groupId: space.group.id,
        groupRoleTo: reviewerMember.role,
        summary: `${users.admin.email} が ${users[space.demoSpace.reviewerUserKey].email} を ${space.group.name} に追加しました`,
        targetEmailSnapshot: users[space.demoSpace.reviewerUserKey].email,
        targetId: reviewerMember.id,
        targetType: 'group_member',
        targetUserId: reviewerMember.userId,
        tenantId,
      });
    }

    const firstPublishedDefinition = space.formDefinitions.find(
      (definition) => definition.status === FormDefinitionStatus.PUBLISHED,
    );
    if (firstPublishedDefinition) {
      rows.push({
        actionType: BusinessAuditAction.INVITATION_CREATED,
        actorEmailSnapshot: users.admin.email,
        actorType: 'user',
        actorUserId: users.admin.id,
        createdAt: daysAgo(13),
        groupId: space.group.id,
        groupRoleTo: GroupMemberRole.USER,
        metadataJson: {
          expiresAt: daysFromNow(7).toISOString(),
        },
        roleTo: UserRole.TENANT_USER,
        summary: `${users.admin.email} が ${space.group.name} の担当者を招待しました`,
        targetEmailSnapshot: `${space.group.name}-guest@reviewflow.demo`,
        targetId: null,
        targetType: 'invitation',
        tenantId,
      });
    }

    for (const application of space.applications) {
      const formDefinition = space.formDefinitions.find(
        (definition) => definition.id === application.formDefinitionId,
      );
      rows.push({
        actionType: BusinessAuditAction.APPLICATION_CREATED,
        actorEmailSnapshot: application.applicantEmail,
        actorType: 'applicant',
        actorUserId: null,
        applicationId: application.id,
        createdAt: application.createdAt,
        groupId: space.group.id,
        metadataJson: applicationMetadata(application, formDefinition),
        statusFrom: null,
        statusTo: ApplicationStatus.DRAFT,
        stepOrderFrom: null,
        stepOrderTo: null,
        summary: `${application.applicantEmail} が申請を作成しました`,
        targetId: application.id,
        targetType: 'application',
        tenantId,
      });
      rows.push({
        actionType: BusinessAuditAction.APPLICATION_SUBMITTED,
        actorEmailSnapshot: application.applicantEmail,
        actorType: 'applicant',
        actorUserId: null,
        applicationId: application.id,
        createdAt: application.submittedAt ?? application.createdAt,
        groupId: space.group.id,
        metadataJson: applicationMetadata(application, formDefinition),
        statusFrom: ApplicationStatus.DRAFT,
        statusTo: ApplicationStatus.IN_REVIEW,
        stepOrderFrom: null,
        stepOrderTo: 1,
        summary: `${application.applicantEmail} が申請を提出しました`,
        targetId: application.id,
        targetType: 'application',
        tenantId,
      });

      const hasFirstStepApproved =
        application.status === ApplicationStatus.APPROVED ||
        application.status === ApplicationStatus.REJECTED ||
        (application.status === ApplicationStatus.IN_REVIEW &&
          application.currentStepOrder !== null &&
          application.currentStepOrder > 1);
      if (hasFirstStepApproved) {
        rows.push({
          actionType: BusinessAuditAction.APPLICATION_APPROVED,
          actorEmailSnapshot: users[space.demoSpace.reviewerUserKey].email,
          actorType: 'user',
          actorUserId: users[space.demoSpace.reviewerUserKey].id,
          applicationId: application.id,
          createdAt: application.updatedAt,
          groupId: space.group.id,
          metadataJson: {
            ...applicationMetadata(application, formDefinition),
            comment: '申請内容、本人確認、必要項目を確認しました。',
          },
          statusFrom: ApplicationStatus.IN_REVIEW,
          statusTo: ApplicationStatus.IN_REVIEW,
          stepOrderFrom: 1,
          stepOrderTo: 2,
          summary: `${users[space.demoSpace.reviewerUserKey].email} が申請を一次承認しました`,
          targetId: application.id,
          targetType: 'application',
          tenantId,
        });
      }

      if (application.status === ApplicationStatus.RETURNED) {
        rows.push({
          actionType: BusinessAuditAction.APPLICATION_RETURNED,
          actorEmailSnapshot: users[space.demoSpace.reviewerUserKey].email,
          actorType: 'user',
          actorUserId: users[space.demoSpace.reviewerUserKey].id,
          applicationId: application.id,
          createdAt: application.updatedAt,
          groupId: space.group.id,
          metadataJson: {
            ...applicationMetadata(application, formDefinition),
            overallComment: '確認に必要な情報が不足しているため差し戻します。',
          },
          statusFrom: ApplicationStatus.IN_REVIEW,
          statusTo: ApplicationStatus.RETURNED,
          stepOrderFrom: 1,
          stepOrderTo: null,
          summary: `${users[space.demoSpace.reviewerUserKey].email} が申請を差し戻しました`,
          targetId: application.id,
          targetType: 'application',
          tenantId,
        });
      }

      if (application.status === ApplicationStatus.APPROVED) {
        rows.push({
          actionType: BusinessAuditAction.APPLICATION_APPROVED,
          actorEmailSnapshot: users[space.demoSpace.approverUserKey].email,
          actorType: 'user',
          actorUserId: users[space.demoSpace.approverUserKey].id,
          applicationId: application.id,
          createdAt: application.updatedAt,
          groupId: space.group.id,
          metadataJson: {
            ...applicationMetadata(application, formDefinition),
            comment: '担当確認結果と添付情報を確認し、承認します。',
          },
          statusFrom: ApplicationStatus.IN_REVIEW,
          statusTo: ApplicationStatus.APPROVED,
          stepOrderFrom: 2,
          stepOrderTo: null,
          summary: `${users[space.demoSpace.approverUserKey].email} が申請を最終承認しました`,
          targetId: application.id,
          targetType: 'application',
          tenantId,
        });
      }

      if (application.status === ApplicationStatus.REJECTED) {
        rows.push({
          actionType: BusinessAuditAction.APPLICATION_REJECTED,
          actorEmailSnapshot: users[space.demoSpace.approverUserKey].email,
          actorType: 'user',
          actorUserId: users[space.demoSpace.approverUserKey].id,
          applicationId: application.id,
          createdAt: application.updatedAt,
          groupId: space.group.id,
          metadataJson: {
            ...applicationMetadata(application, formDefinition),
            comment: '利用条件と安全管理の確認が不足しているため却下します。',
          },
          statusFrom: ApplicationStatus.IN_REVIEW,
          statusTo: ApplicationStatus.REJECTED,
          stepOrderFrom: 2,
          stepOrderTo: null,
          summary: `${users[space.demoSpace.approverUserKey].email} が申請を却下しました`,
          targetId: application.id,
          targetType: 'application',
          tenantId,
        });
      }
    }
  }

  rows.push({
    actionType: BusinessAuditAction.USER_ROLE_CHANGED,
    actorEmailSnapshot: users.admin.email,
    actorType: 'user',
    actorUserId: users.admin.id,
    createdAt: daysAgo(1),
    groupId: null,
    roleFrom: UserRole.TENANT_USER,
    roleTo: UserRole.TENANT_ADMIN,
    summary: `${users.admin.email} が ${users.citizenOperator.email} の権限を変更しました`,
    targetEmailSnapshot: users.citizenOperator.email,
    targetId: users.citizenOperator.id,
    targetType: 'user',
    targetUserId: users.citizenOperator.id,
    tenantId,
  });

  for (const row of rows) {
    const saved = await auditRepo.save(
      auditRepo.create({
        tenantId: row.tenantId,
        groupId: row.groupId,
        actorUserId: row.actorUserId,
        actorType: row.actorType,
        actorEmailSnapshot: row.actorEmailSnapshot,
        actionType: row.actionType,
        targetType: row.targetType,
        targetId: row.targetId,
        targetUserId: row.targetUserId ?? null,
        targetEmailSnapshot: row.targetEmailSnapshot ?? null,
        applicationId: row.applicationId ?? null,
        statusFrom: row.statusFrom ?? null,
        statusTo: row.statusTo ?? null,
        stepOrderFrom: row.stepOrderFrom ?? null,
        stepOrderTo: row.stepOrderTo ?? null,
        roleFrom: row.roleFrom ?? null,
        roleTo: row.roleTo ?? null,
        groupRoleFrom: row.groupRoleFrom ?? null,
        groupRoleTo: row.groupRoleTo ?? null,
        summary: row.summary,
        metadataJson: row.metadataJson ?? null,
      }),
    );
    await auditRepo.update({ id: saved.id }, { createdAt: row.createdAt });
  }
}

type DemoAuditLogRow = {
  actionType: string;
  actorEmailSnapshot: string | null;
  actorType: AuditActorType;
  actorUserId: string | null;
  applicationId?: string | null;
  createdAt: Date;
  groupId: string | null;
  groupRoleFrom?: GroupMemberRoleValue | null;
  groupRoleTo?: GroupMemberRoleValue | null;
  metadataJson?: Record<string, unknown> | null;
  roleFrom?: UserRoleValue | null;
  roleTo?: UserRoleValue | null;
  statusFrom?: ApplicationStatusValue | null;
  statusTo?: ApplicationStatusValue | null;
  stepOrderFrom?: number | null;
  stepOrderTo?: number | null;
  summary: string;
  targetEmailSnapshot?: string | null;
  targetId: string | null;
  targetType: string;
  targetUserId?: string | null;
  tenantId: string;
};

function applicationMetadata(
  application: Application,
  formDefinition: FormDefinition | undefined,
): Record<string, unknown> {
  return {
    applicantEmail: application.applicantEmail,
    approvalFlowId: application.approvalFlowId,
    formDefinitionId: application.formDefinitionId,
    formDefinitionName: formDefinition?.name,
  };
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
