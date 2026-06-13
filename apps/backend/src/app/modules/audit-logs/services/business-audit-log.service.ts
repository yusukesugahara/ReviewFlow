import { Injectable } from '@nestjs/common';
import type { AuthUserPayload } from '../../../../decorators/current-user.decorator';
import type { ApplicationStatusValue } from '../../../../models/constants/application-status';
import type { GroupMemberRoleValue } from '../../../../models/constants/group-member-role';
import type { UserRoleValue } from '../../../../models/constants/user-role';
import type { Application } from '../../../../models/entities/application.entity';
import type { AuditActorType } from '../../../../models/entities/audit-log.entity';
import type { Group } from '../../../../models/entities/group.entity';
import type { GroupMember } from '../../../../models/entities/group-member.entity';
import type { Invitation } from '../../../../models/entities/invitation.entity';
import type { User } from '../../../../models/entities/user.entity';
import {
  AuditLogsRepository,
  type CreateAuditLogParams,
} from '../../../../models/repositories/audit-logs.repository';

export const BusinessAuditAction = {
  APPLICATION_CREATED: 'application.created',
  APPLICATION_SUBMITTED: 'application.submitted',
  APPLICATION_APPROVED: 'application.approved',
  APPLICATION_RETURNED: 'application.returned',
  APPLICATION_CORRECTED: 'application.corrected',
  APPLICATION_RESUBMITTED: 'application.resubmitted',
  APPLICATION_REJECTED: 'application.rejected',
  INVITATION_CREATED: 'invitation.created',
  INVITATION_ACCEPTED: 'invitation.accepted',
  USER_ROLE_CHANGED: 'user.role_changed',
  USER_DEACTIVATED: 'user.deactivated',
  USER_RESTORED: 'user.restored',
  SPACE_CREATED: 'space.created',
  SPACE_DELETED: 'space.deleted',
  SPACE_MEMBER_ADDED: 'space.member_added',
  SPACE_MEMBER_REMOVED: 'space.member_removed',
  SPACE_MEMBER_LEFT: 'space.member_left',
  SPACE_MEMBER_ROLE_CHANGED: 'space.member_role_changed',
} as const;

export type BusinessAuditActionValue =
  (typeof BusinessAuditAction)[keyof typeof BusinessAuditAction];

type AuditActor = {
  id: string | null;
  email: string | null;
  type: AuditActorType;
};

type ApplicationSnapshot = {
  status: ApplicationStatusValue | null;
  stepOrder: number | null;
};

@Injectable()
export class BusinessAuditLogService {
  constructor(private readonly auditLogsRepository: AuditLogsRepository) {}

  async recordApplicationEvent(params: {
    actionType: BusinessAuditActionValue;
    actor: AuditActor;
    app: Pick<
      Application,
      | 'id'
      | 'tenantId'
      | 'groupId'
      | 'applicantEmail'
      | 'status'
      | 'currentStepOrder'
      | 'formDefinitionId'
      | 'approvalFlowId'
    >;
    before?: ApplicationSnapshot;
    after?: ApplicationSnapshot;
    metadataJson?: Record<string, unknown>;
    summary?: string;
  }): Promise<void> {
    const before = params.before ?? {
      status: null,
      stepOrder: null,
    };
    const after = params.after ?? {
      status: params.app.status,
      stepOrder: params.app.currentStepOrder,
    };
    await this.record({
      tenantId: params.app.tenantId,
      groupId: params.app.groupId,
      actorUserId: params.actor.id,
      actorType: params.actor.type,
      actorEmailSnapshot: params.actor.email,
      actionType: params.actionType,
      targetType: 'application',
      targetId: params.app.id,
      applicationId: params.app.id,
      statusFrom: before.status,
      statusTo: after.status,
      stepOrderFrom: before.stepOrder,
      stepOrderTo: after.stepOrder,
      summary:
        params.summary ??
        this.applicationSummary(params.actionType, params.app, before, after),
      metadataJson: {
        applicantEmail: params.app.applicantEmail,
        formDefinitionId: params.app.formDefinitionId,
        approvalFlowId: params.app.approvalFlowId,
        ...(params.metadataJson ?? {}),
      },
    });
  }

  async recordInvitationCreated(params: {
    actor: AuthUserPayload;
    invitation: Pick<
      Invitation,
      | 'id'
      | 'tenantId'
      | 'email'
      | 'role'
      | 'groupId'
      | 'groupRole'
      | 'expiresAt'
    >;
  }): Promise<void> {
    await this.record({
      tenantId: params.invitation.tenantId,
      groupId: params.invitation.groupId,
      actorUserId: params.actor.id,
      actorType: 'user',
      actorEmailSnapshot: params.actor.email,
      actionType: BusinessAuditAction.INVITATION_CREATED,
      targetType: 'invitation',
      targetId: params.invitation.id,
      targetEmailSnapshot: params.invitation.email,
      roleTo: params.invitation.role,
      groupRoleTo: params.invitation.groupRole,
      summary: `${params.actor.email} invited ${params.invitation.email}`,
      metadataJson: {
        expiresAt: params.invitation.expiresAt.toISOString(),
      },
    });
  }

  async recordInvitationAccepted(params: {
    invitation: Pick<
      Invitation,
      'id' | 'tenantId' | 'email' | 'role' | 'groupId' | 'groupRole'
    >;
    user: Pick<User, 'id' | 'email'>;
  }): Promise<void> {
    await this.record({
      tenantId: params.invitation.tenantId,
      groupId: params.invitation.groupId,
      actorUserId: params.user.id,
      actorType: 'user',
      actorEmailSnapshot: params.user.email,
      actionType: BusinessAuditAction.INVITATION_ACCEPTED,
      targetType: 'invitation',
      targetId: params.invitation.id,
      targetUserId: params.user.id,
      targetEmailSnapshot: params.user.email,
      roleTo: params.invitation.role,
      groupRoleTo: params.invitation.groupRole,
      summary: `${params.user.email} accepted invitation`,
      metadataJson: null,
    });
  }

  async recordUserEvent(params: {
    actionType: BusinessAuditActionValue;
    actor: AuthUserPayload;
    target: Pick<User, 'id' | 'tenantId' | 'email' | 'role' | 'isActive'>;
    roleFrom?: UserRoleValue | null;
    roleTo?: UserRoleValue | null;
    metadataJson?: Record<string, unknown>;
    summary?: string;
  }): Promise<void> {
    await this.record({
      tenantId: params.target.tenantId,
      groupId: null,
      actorUserId: params.actor.id,
      actorType: 'user',
      actorEmailSnapshot: params.actor.email,
      actionType: params.actionType,
      targetType: 'user',
      targetId: params.target.id,
      targetUserId: params.target.id,
      targetEmailSnapshot: params.target.email,
      roleFrom: params.roleFrom ?? null,
      roleTo: params.roleTo ?? null,
      summary:
        params.summary ??
        this.userSummary(params.actionType, params.actor.email, params.target),
      metadataJson: params.metadataJson ?? null,
    });
  }

  async recordSpaceEvent(params: {
    actionType: BusinessAuditActionValue;
    actor: AuthUserPayload;
    group: Pick<Group, 'id' | 'tenantId' | 'name'>;
    metadataJson?: Record<string, unknown>;
    summary?: string;
  }): Promise<void> {
    await this.record({
      tenantId: params.group.tenantId,
      groupId: params.group.id,
      actorUserId: params.actor.id,
      actorType: 'user',
      actorEmailSnapshot: params.actor.email,
      actionType: params.actionType,
      targetType: 'space',
      targetId: params.group.id,
      summary:
        params.summary ??
        `${params.actor.email} ${params.actionType} ${params.group.name}`,
      metadataJson: {
        groupName: params.group.name,
        ...(params.metadataJson ?? {}),
      },
    });
  }

  async recordSpaceMemberEvent(params: {
    actionType: BusinessAuditActionValue;
    actor: AuthUserPayload;
    member: Pick<
      GroupMember,
      'id' | 'tenantId' | 'groupId' | 'userId' | 'role'
    > & {
      user?: Pick<User, 'email'> | null;
    };
    groupRoleFrom?: GroupMemberRoleValue | null;
    groupRoleTo?: GroupMemberRoleValue | null;
    metadataJson?: Record<string, unknown>;
    summary?: string;
  }): Promise<void> {
    const targetEmail = params.member.user?.email ?? null;
    await this.record({
      tenantId: params.member.tenantId,
      groupId: params.member.groupId,
      actorUserId: params.actor.id,
      actorType: 'user',
      actorEmailSnapshot: params.actor.email,
      actionType: params.actionType,
      targetType: 'group_member',
      targetId: params.member.id,
      targetUserId: params.member.userId,
      targetEmailSnapshot: targetEmail,
      groupRoleFrom: params.groupRoleFrom ?? null,
      groupRoleTo: params.groupRoleTo ?? null,
      summary:
        params.summary ??
        this.spaceMemberSummary(
          params.actionType,
          params.actor.email,
          targetEmail ?? params.member.userId,
        ),
      metadataJson: params.metadataJson ?? null,
    });
  }

  private async record(params: CreateAuditLogParams): Promise<void> {
    await this.auditLogsRepository.create(params);
  }

  private applicationSummary(
    actionType: BusinessAuditActionValue,
    app: Pick<Application, 'id'>,
    before: ApplicationSnapshot,
    after: ApplicationSnapshot,
  ): string {
    const transition = `${before.status ?? '-'} step ${before.stepOrder ?? '-'} -> ${
      after.status ?? '-'
    } step ${after.stepOrder ?? '-'}`;
    return `${actionType} application ${app.id} (${transition})`;
  }

  private userSummary(
    actionType: BusinessAuditActionValue,
    actorEmail: string,
    target: Pick<User, 'email'>,
  ): string {
    return `${actorEmail} ${actionType} ${target.email}`;
  }

  private spaceMemberSummary(
    actionType: BusinessAuditActionValue,
    actorEmail: string,
    targetLabel: string,
  ): string {
    return `${actorEmail} ${actionType} ${targetLabel}`;
  }
}
