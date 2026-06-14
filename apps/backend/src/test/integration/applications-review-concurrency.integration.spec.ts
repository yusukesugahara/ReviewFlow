import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../../app/app.module';
import { BusinessAuditAction } from '../../app/modules/audit-logs/services/business-audit-log.service';
import { ApplicationReviewUseCaseService } from '../../app/modules/applications/services/use-cases/application-review-use-case.service';
import { ClientErrorCodes } from '../../common/errors';
import type { AuthUserPayload } from '../../decorators/current-user.decorator';
import { ApplicationApprovalAction } from '../../models/constants/application-approval-action';
import { ApplicationStatus } from '../../models/constants/application-status';
import { FormDefinitionStatus } from '../../models/constants/form-definition-status';
import { GroupMemberRole } from '../../models/constants/group-member-role';
import { UserRole } from '../../models/constants/user-role';
import { ApplicationApproval } from '../../models/entities/application-approval.entity';
import { Application } from '../../models/entities/application.entity';
import { ApprovalFlow } from '../../models/entities/approval-flow.entity';
import { ApprovalStep } from '../../models/entities/approval-step.entity';
import { AuditLog } from '../../models/entities/audit-log.entity';
import { FormDefinition } from '../../models/entities/form-definition.entity';
import { GroupMember } from '../../models/entities/group-member.entity';
import { Group } from '../../models/entities/group.entity';
import { Tenant } from '../../models/entities/tenant.entity';
import { User } from '../../models/entities/user.entity';
import {
  preparePostgresTestDatabase,
  truncatePostgresTables,
} from '../test-postgres';

describe('Applications review concurrency (integration)', () => {
  let moduleRef: TestingModule;
  let dataSource: DataSource;
  let reviewUseCase: ApplicationReviewUseCaseService;

  beforeEach(async () => {
    process.env.INTERNAL_API_KEY = 'int-api-key';
    process.env.JWT_SECRET = 'int-jwt-secret-at-least-32-characters-long';
    await preparePostgresTestDatabase();

    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    dataSource = moduleRef.get(DataSource);
    reviewUseCase = moduleRef.get(ApplicationReviewUseCaseService);
    await truncatePostgresTables(dataSource);
  });

  afterEach(async () => {
    await moduleRef?.close();
  });

  it('serializes concurrent approvals so only one approval and audit log are recorded', async () => {
    const seeded = await seedReviewableApplication(dataSource);
    const reviewer1 = toActor(seeded.reviewer1);
    const reviewer2 = toActor(seeded.reviewer2);

    const results = await Promise.allSettled([
      reviewUseCase.approve(reviewer1, seeded.application.id, {
        comment: 'approved by reviewer 1',
        expectedStepOrder: 1,
      }),
      reviewUseCase.approve(reviewer2, seeded.application.id, {
        comment: 'approved by reviewer 2',
        expectedStepOrder: 1,
      }),
    ]);

    const fulfilled = results.filter((result) => result.status === 'fulfilled');
    const rejected = results.filter((result) => result.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.reason).toMatchObject({
      errorCode: ClientErrorCodes.APPLICATION_APPROVAL_FORBIDDEN,
    });

    const application = await dataSource
      .getRepository(Application)
      .findOneByOrFail({ id: seeded.application.id });
    expect(application.status).toBe(ApplicationStatus.APPROVED);
    expect(application.currentStepOrder).toBeNull();

    const approvals = await dataSource.getRepository(ApplicationApproval).find({
      where: { applicationId: seeded.application.id },
    });
    expect(approvals).toHaveLength(1);
    expect(approvals[0]?.action).toBe(ApplicationApprovalAction.APPROVED);
    expect([seeded.reviewer1.id, seeded.reviewer2.id]).toContain(
      approvals[0]?.actedByUserId,
    );

    const auditLogs = await dataSource.getRepository(AuditLog).find({
      where: {
        applicationId: seeded.application.id,
        actionType: BusinessAuditAction.APPLICATION_APPROVED,
      },
    });
    expect(auditLogs).toHaveLength(1);
  });

  it('rejects a stale concurrent approval instead of applying it to the next step', async () => {
    const seeded = await seedReviewableApplication(dataSource, {
      includeSecondStep: true,
    });
    const admin = toActor(seeded.admin);

    const results = await Promise.allSettled([
      reviewUseCase.approve(admin, seeded.application.id, {
        comment: 'approve step 1',
        expectedStepOrder: 1,
      }),
      reviewUseCase.approve(admin, seeded.application.id, {
        comment: 'stale approve step 1',
        expectedStepOrder: 1,
      }),
    ]);

    const fulfilled = results.filter((result) => result.status === 'fulfilled');
    const rejected = results.filter((result) => result.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.reason).toMatchObject({
      errorCode: ClientErrorCodes.APPLICATION_REVIEW_STATE_CONFLICT,
    });

    const application = await dataSource
      .getRepository(Application)
      .findOneByOrFail({ id: seeded.application.id });
    expect(application.status).toBe(ApplicationStatus.IN_REVIEW);
    expect(application.currentStepOrder).toBe(2);

    const approvals = await dataSource.getRepository(ApplicationApproval).find({
      where: { applicationId: seeded.application.id },
    });
    expect(approvals).toHaveLength(1);
    expect(approvals[0]?.approvalStepId).toBe(seeded.step1.id);

    const auditLogs = await dataSource.getRepository(AuditLog).find({
      where: {
        applicationId: seeded.application.id,
        actionType: BusinessAuditAction.APPLICATION_APPROVED,
      },
    });
    expect(auditLogs).toHaveLength(1);
  });
});

function toActor(user: User): AuthUserPayload {
  return {
    id: user.id,
    email: user.email,
    tenantId: user.tenantId,
    roles: [user.role],
  };
}

async function seedReviewableApplication(
  dataSource: DataSource,
  options: { includeSecondStep?: boolean } = {},
): Promise<{
  admin: User;
  application: Application;
  reviewer1: User;
  reviewer2: User;
  step1: ApprovalStep;
}> {
  return dataSource.transaction(async (manager) => {
    const tenant = await manager.getRepository(Tenant).save({
      name: 'Concurrency Tenant',
    });
    const admin = await manager.getRepository(User).save({
      tenantId: tenant.id,
      name: 'Admin',
      email: 'admin-concurrency@example.com',
      passwordHash: 'hash',
      role: UserRole.TENANT_ADMIN,
      isActive: true,
    });
    const group = await manager.getRepository(Group).save({
      tenantId: tenant.id,
      name: 'Approvals',
      description: null,
      createdByUserId: admin.id,
    });
    const reviewer1 = await manager.getRepository(User).save({
      tenantId: tenant.id,
      name: 'Reviewer 1',
      email: 'reviewer-1@example.com',
      passwordHash: 'hash',
      role: UserRole.TENANT_USER,
      isActive: true,
    });
    const reviewer2 = await manager.getRepository(User).save({
      tenantId: tenant.id,
      name: 'Reviewer 2',
      email: 'reviewer-2@example.com',
      passwordHash: 'hash',
      role: UserRole.TENANT_USER,
      isActive: true,
    });

    await manager.getRepository(GroupMember).save([
      {
        tenantId: tenant.id,
        groupId: group.id,
        userId: reviewer1.id,
        invitedByUserId: admin.id,
        role: GroupMemberRole.USER,
      },
      {
        tenantId: tenant.id,
        groupId: group.id,
        userId: reviewer2.id,
        invitedByUserId: admin.id,
        role: GroupMemberRole.USER,
      },
    ]);

    const formDefinition = await manager.getRepository(FormDefinition).save({
      tenantId: tenant.id,
      groupId: group.id,
      name: 'Expense Request',
      description: null,
      status: FormDefinitionStatus.PUBLISHED,
      archivedFromStatus: null,
      createdByUserId: admin.id,
    });
    const approvalFlow = await manager.getRepository(ApprovalFlow).save({
      tenantId: tenant.id,
      groupId: group.id,
      name: 'Two reviewer final step',
      isActive: true,
    });
    const step1 = await manager.getRepository(ApprovalStep).save({
      tenantId: tenant.id,
      groupId: group.id,
      approvalFlowId: approvalFlow.id,
      stepOrder: 1,
      stepName: 'Final approval',
      assigneeUserId: reviewer1.id,
      assigneeUserIds: [reviewer1.id, reviewer2.id],
      canReturn: true,
    });
    if (options.includeSecondStep) {
      await manager.getRepository(ApprovalStep).save({
        tenantId: tenant.id,
        groupId: group.id,
        approvalFlowId: approvalFlow.id,
        stepOrder: 2,
        stepName: 'Final confirmation',
        assigneeUserId: reviewer2.id,
        assigneeUserIds: [reviewer2.id],
        canReturn: true,
      });
    }

    const application = await manager.getRepository(Application).save({
      tenantId: tenant.id,
      groupId: group.id,
      applicantUserId: null,
      applicantEmail: 'applicant@example.com',
      formDefinitionId: formDefinition.id,
      approvalFlowId: approvalFlow.id,
      currentStepOrder: 1,
      status: ApplicationStatus.IN_REVIEW,
      submittedAt: new Date(),
    });

    return { admin, application, reviewer1, reviewer2, step1 };
  });
}
