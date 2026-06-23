import { Injectable } from '@nestjs/common';
import type { AuthUserPayload } from '../../../../decorators/current-user.decorator';
import type { ApplicationStatusValue } from '../../../../models/constants/application-status';
import type { GroupMemberRoleValue } from '../../../../models/constants/group-member-role';
import type { UserRoleValue } from '../../../../models/constants/user-role';
import type { Application } from '../../../../models/entities/application.entity';
import type {
  AuditActorType,
  AuditEventActor,
  AuditEventChange,
  AuditEventResource,
} from '../../../../models/entities/audit-log.entity';
import type { Group } from '../../../../models/entities/group.entity';
import type { GroupMember } from '../../../../models/entities/group-member.entity';
import type { Invitation } from '../../../../models/entities/invitation.entity';
import type { User } from '../../../../models/entities/user.entity';
import {
  AuditLogsRepository,
  type CreateAuditLogParams,
} from '../../../../models/repositories/audit-logs.repository';
import type { TransactionManager } from '../../../transaction';

/**
 * 業務監査ログに記録する action type。
 *
 * 操作種別は dot notation に揃え、画面表示・検索・分析で同じ値を使えるようにする。
 */
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
  USER_PROFILE_UPDATED: 'user.profile_updated',
  USER_PASSWORD_CHANGED: 'user.password_changed',
  USER_ROLE_CHANGED: 'user.role_changed',
  USER_DEACTIVATED: 'user.deactivated',
  USER_RESTORED: 'user.restored',
  SPACE_CREATED: 'space.created',
  SPACE_UPDATED: 'space.updated',
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

type MetadataChangeKey = {
  field: string;
  fromKey: string;
  toKey: string;
};

const metadataChangeKeys: MetadataChangeKey[] = [
  { field: 'isActive', fromKey: 'isActiveFrom', toKey: 'isActiveTo' },
  { field: 'email', fromKey: 'emailFrom', toKey: 'emailTo' },
  { field: 'userName', fromKey: 'userNameFrom', toKey: 'userNameTo' },
  { field: 'name', fromKey: 'nameFrom', toKey: 'nameTo' },
  {
    field: 'description',
    fromKey: 'descriptionFrom',
    toKey: 'descriptionTo',
  },
];

/**
 * 申請・招待・ユーザー・スペース操作の業務監査ログを記録する service。
 *
 * request logging とは別に、誰が何を変更したかを業務イベントとして残す。
 */
@Injectable()
export class BusinessAuditLogService {
  constructor(private readonly auditLogsRepository: AuditLogsRepository) {}

  /**
   * 申請 workflow の状態変化を監査ログに記録する。
   *
   * before / after が省略された場合は、作成イベント向けの初期値と現在の申請状態から補完する。
   */
  async recordApplicationEvent(
    params: {
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
    },
    manager?: TransactionManager,
  ): Promise<void> {
    const before = params.before ?? {
      status: null,
      stepOrder: null,
    };
    const after = params.after ?? {
      status: params.app.status,
      stepOrder: params.app.currentStepOrder,
    };
    await this.record(
      {
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
      },
      manager,
    );
  }

  /**
   * 招待作成を業務監査ログに記録する。
   * @param params 招待作成イベント
   * @param manager トランザクションマネージャー
   */
  async recordInvitationCreated(
    params: {
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
    },
    manager?: TransactionManager,
  ): Promise<void> {
    await this.record(
      {
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
      },
      manager,
    );
  }

  /**
   * 招待受諾を業務監査ログに記録する。
   * @param params 招待受諾イベント
   * @param manager トランザクションマネージャー
   */
  async recordInvitationAccepted(
    params: {
      invitation: Pick<
        Invitation,
        'id' | 'tenantId' | 'email' | 'role' | 'groupId' | 'groupRole'
      >;
      user: Pick<User, 'id' | 'email'>;
    },
    manager?: TransactionManager,
  ): Promise<void> {
    await this.record(
      {
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
      },
      manager,
    );
  }

  /**
   * ユーザー操作を業務監査ログに記録する。
   * @param params ユーザー操作イベント
   * @param manager トランザクションマネージャー
   */
  async recordUserEvent(
    params: {
      actionType: BusinessAuditActionValue;
      actor: Pick<AuthUserPayload, 'id' | 'email'>;
      target: Pick<User, 'id' | 'tenantId' | 'email' | 'role' | 'isActive'>;
      roleFrom?: UserRoleValue | null;
      roleTo?: UserRoleValue | null;
      metadataJson?: Record<string, unknown>;
      summary?: string;
    },
    manager?: TransactionManager,
  ): Promise<void> {
    await this.record(
      {
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
          this.userSummary(
            params.actionType,
            params.actor.email,
            params.target,
          ),
        metadataJson: params.metadataJson ?? null,
      },
      manager,
    );
  }

  /**
   * space 操作を業務監査ログに記録する。
   * @param params space 操作イベント
   * @param manager トランザクションマネージャー
   */
  async recordSpaceEvent(
    params: {
      actionType: BusinessAuditActionValue;
      actor: AuthUserPayload;
      group: Pick<Group, 'id' | 'tenantId' | 'name'>;
      metadataJson?: Record<string, unknown>;
      summary?: string;
    },
    manager?: TransactionManager,
  ): Promise<void> {
    await this.record(
      {
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
      },
      manager,
    );
  }

  /**
   * space メンバー操作を業務監査ログに記録する。
   * @param params space メンバー操作イベント
   * @param manager トランザクションマネージャー
   */
  async recordSpaceMemberEvent(
    params: {
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
    },
    manager?: TransactionManager,
  ): Promise<void> {
    const targetEmail = params.member.user?.email ?? null;
    await this.record(
      {
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
      },
      manager,
    );
  }

  /**
   * 監査ログ repository へイベントを保存する。
   * @param params 監査ログ作成パラメータ
   * @param manager トランザクションマネージャー
   */
  private async record(
    params: CreateAuditLogParams,
    manager?: TransactionManager,
  ): Promise<void> {
    await this.auditLogsRepository.create(
      this.toGenericAuditLog(params),
      manager,
    );
  }

  /**
   * 既存の業務監査パラメータを、画面・検索で使う汎用監査イベント形へ正規化する。
   * @param params 旧形式を含む監査ログ作成パラメータ
   * @returns 汎用フィールドを補完した監査ログ作成パラメータ
   */
  private toGenericAuditLog(
    params: CreateAuditLogParams,
  ): CreateAuditLogParams {
    const scopeType = params.scopeType ?? (params.groupId ? 'space' : 'tenant');
    const scopeId = params.scopeId ?? params.groupId ?? params.tenantId;
    const resourceType = params.resourceType ?? params.targetType;
    const resourceId = params.resourceId ?? params.targetId;
    const resourceLabelSnapshot =
      params.resourceLabelSnapshot ?? this.resourceLabelSnapshot(params);
    const actorJson =
      params.actorJson ??
      ({
        email: params.actorEmailSnapshot ?? null,
        id: params.actorUserId,
        label: params.actorEmailSnapshot ?? null,
        type: params.actorType,
      } satisfies AuditEventActor);
    const resourceJson =
      params.resourceJson ??
      ({
        id: resourceId,
        label: resourceLabelSnapshot,
        type: resourceType,
      } satisfies AuditEventResource);

    return {
      ...params,
      scopeType,
      scopeId,
      resourceType,
      resourceId,
      resourceLabelSnapshot,
      operation: params.operation ?? operationFromActionType(params.actionType),
      outcome: params.outcome ?? 'success',
      actorJson,
      resourceJson,
      changesJson: params.changesJson ?? buildGenericChanges(params),
    };
  }

  /**
   * 対象リソースの表示用スナップショットを組み立てる。
   * @param params 監査ログ作成パラメータ
   * @returns 表示ラベル
   */
  private resourceLabelSnapshot(params: CreateAuditLogParams): string | null {
    if (params.targetEmailSnapshot) {
      return params.targetEmailSnapshot;
    }
    const metadata = params.metadataJson ?? {};
    if (params.targetType === 'space') {
      return stringValue(metadata.groupName) ?? params.targetId;
    }
    return params.targetId;
  }

  /**
   * 申請イベントの既定 summary を組み立てる。
   * @param actionType 操作種別
   * @param app 申請
   * @param before 変更前状態
   * @param after 変更後状態
   * @returns summary
   */
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

  /**
   * ユーザーイベントの既定 summary を組み立てる。
   * @param actionType 操作種別
   * @param actorEmail 操作者メールアドレス
   * @param target 対象ユーザー
   * @returns summary
   */
  private userSummary(
    actionType: BusinessAuditActionValue,
    actorEmail: string,
    target: Pick<User, 'email'>,
  ): string {
    return `${actorEmail} ${actionType} ${target.email}`;
  }

  /**
   * space メンバーイベントの既定 summary を組み立てる。
   * @param actionType 操作種別
   * @param actorEmail 操作者メールアドレス
   * @param targetLabel 対象表示名
   * @returns summary
   */
  private spaceMemberSummary(
    actionType: BusinessAuditActionValue,
    actorEmail: string,
    targetLabel: string,
  ): string {
    return `${actorEmail} ${actionType} ${targetLabel}`;
  }
}

function operationFromActionType(actionType: string): string {
  const separatorIndex = actionType.indexOf('.');
  return separatorIndex >= 0
    ? actionType.slice(separatorIndex + 1)
    : actionType;
}

function buildGenericChanges(params: CreateAuditLogParams): AuditEventChange[] {
  const changes: AuditEventChange[] = [];

  addChange(
    changes,
    'status',
    params.statusFrom ?? null,
    params.statusTo ?? null,
  );
  addChange(
    changes,
    'stepOrder',
    params.stepOrderFrom ?? null,
    params.stepOrderTo ?? null,
  );
  addChange(changes, 'role', params.roleFrom ?? null, params.roleTo ?? null);
  addChange(
    changes,
    'groupRole',
    params.groupRoleFrom ?? null,
    params.groupRoleTo ?? null,
  );

  const metadata = params.metadataJson ?? {};
  for (const key of metadataChangeKeys) {
    if (key.fromKey in metadata || key.toKey in metadata) {
      addChange(changes, key.field, metadata[key.fromKey], metadata[key.toKey]);
    }
  }

  return changes;
}

function addChange(
  changes: AuditEventChange[],
  field: string,
  from: unknown,
  to: unknown,
): void {
  if (!hasChangeValue(from) && !hasChangeValue(to)) {
    return;
  }
  changes.push({ field, from: from ?? null, to: to ?? null });
}

function hasChangeValue(value: unknown): boolean {
  return value !== undefined && value !== null;
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}
