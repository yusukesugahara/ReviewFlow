import { ApplicationStatus } from '../../../../models/constants/application-status';
import { GroupMemberRole } from '../../../../models/constants/group-member-role';
import { UserRole } from '../../../../models/constants/user-role';
import type { Application } from '../../../../models/entities/application.entity';
import type { GroupMember } from '../../../../models/entities/group-member.entity';
import type { User } from '../../../../models/entities/user.entity';
import { AuditLogsRepository } from '../../../../models/repositories/audit-logs.repository';
import {
  BusinessAuditAction,
  BusinessAuditLogService,
} from './business-audit-log.service';

describe('BusinessAuditLogService', () => {
  let auditLogsRepository: jest.Mocked<Pick<AuditLogsRepository, 'create'>>;
  let service: BusinessAuditLogService;

  beforeEach(() => {
    auditLogsRepository = {
      create: jest.fn(),
    };
    service = new BusinessAuditLogService(
      auditLogsRepository as unknown as AuditLogsRepository,
    );
  });

  it('records application events with actor and status transition snapshots', async () => {
    const app = {
      id: 'app-1',
      tenantId: 'tenant-1',
      groupId: 'group-1',
      applicantEmail: 'applicant@example.com',
      status: ApplicationStatus.APPROVED,
      currentStepOrder: null,
      formDefinitionId: 'form-1',
      approvalFlowId: 'flow-1',
    } as Application;

    await service.recordApplicationEvent({
      actionType: BusinessAuditAction.APPLICATION_APPROVED,
      actor: {
        id: 'reviewer-1',
        email: 'reviewer@example.com',
        type: 'user',
      },
      app,
      before: {
        status: ApplicationStatus.IN_REVIEW,
        stepOrder: 1,
      },
      after: {
        status: ApplicationStatus.APPROVED,
        stepOrder: null,
      },
      metadataJson: { comment: 'ok' },
    });

    expect(auditLogsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'application.approved',
        actorEmailSnapshot: 'reviewer@example.com',
        actorType: 'user',
        actorUserId: 'reviewer-1',
        applicationId: 'app-1',
        groupId: 'group-1',
        statusFrom: ApplicationStatus.IN_REVIEW,
        statusTo: ApplicationStatus.APPROVED,
        stepOrderFrom: 1,
        stepOrderTo: null,
        scopeType: 'space',
        scopeId: 'group-1',
        resourceType: 'application',
        resourceId: 'app-1',
        resourceLabelSnapshot: 'app-1',
        operation: 'approved',
        outcome: 'success',
        targetId: 'app-1',
        targetType: 'application',
        tenantId: 'tenant-1',
      }),
      undefined,
    );
    expect(auditLogsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        metadataJson: expect.objectContaining({
          applicantEmail: 'applicant@example.com',
          approvalFlowId: 'flow-1',
          comment: 'ok',
          formDefinitionId: 'form-1',
        }) as Record<string, unknown>,
        actorJson: {
          email: 'reviewer@example.com',
          id: 'reviewer-1',
          label: 'reviewer@example.com',
          type: 'user',
        },
        resourceJson: {
          id: 'app-1',
          label: 'app-1',
          type: 'application',
        },
        changesJson: [
          {
            field: 'status',
            from: ApplicationStatus.IN_REVIEW,
            to: ApplicationStatus.APPROVED,
          },
          { field: 'stepOrder', from: 1, to: null },
        ],
      }),
      undefined,
    );
  });

  it('records user and space member changes with target snapshots', async () => {
    const actor = {
      id: 'admin-1',
      email: 'admin@example.com',
      tenantId: 'tenant-1',
      roles: [UserRole.TENANT_ADMIN],
    };
    const target = {
      id: 'user-1',
      tenantId: 'tenant-1',
      email: 'member@example.com',
      role: UserRole.TENANT_ADMIN,
      isActive: true,
    } as User;
    const member = {
      id: 'member-1',
      tenantId: 'tenant-1',
      groupId: 'group-1',
      userId: 'user-1',
      role: GroupMemberRole.ADMIN,
      user: { email: 'member@example.com' },
    } as GroupMember;

    await service.recordUserEvent({
      actionType: BusinessAuditAction.USER_ROLE_CHANGED,
      actor,
      target,
      roleFrom: UserRole.TENANT_USER,
      roleTo: UserRole.TENANT_ADMIN,
    });
    await service.recordSpaceMemberEvent({
      actionType: BusinessAuditAction.SPACE_MEMBER_ROLE_CHANGED,
      actor,
      member,
      groupRoleFrom: GroupMemberRole.USER,
      groupRoleTo: GroupMemberRole.ADMIN,
    });

    expect(auditLogsRepository.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        actionType: 'user.role_changed',
        roleFrom: UserRole.TENANT_USER,
        roleTo: UserRole.TENANT_ADMIN,
        scopeType: 'tenant',
        scopeId: 'tenant-1',
        resourceType: 'user',
        resourceId: 'user-1',
        resourceLabelSnapshot: 'member@example.com',
        operation: 'role_changed',
        targetEmailSnapshot: 'member@example.com',
        targetType: 'user',
        targetUserId: 'user-1',
        changesJson: [
          {
            field: 'role',
            from: UserRole.TENANT_USER,
            to: UserRole.TENANT_ADMIN,
          },
        ],
      }),
      undefined,
    );
    expect(auditLogsRepository.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        actionType: 'space.member_role_changed',
        groupRoleFrom: GroupMemberRole.USER,
        groupRoleTo: GroupMemberRole.ADMIN,
        scopeType: 'space',
        scopeId: 'group-1',
        resourceType: 'group_member',
        resourceId: 'member-1',
        resourceLabelSnapshot: 'member@example.com',
        operation: 'member_role_changed',
        targetEmailSnapshot: 'member@example.com',
        targetType: 'group_member',
        targetUserId: 'user-1',
        changesJson: [
          {
            field: 'groupRole',
            from: GroupMemberRole.USER,
            to: GroupMemberRole.ADMIN,
          },
        ],
      }),
      undefined,
    );
  });
});
