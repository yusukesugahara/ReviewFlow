import { Injectable } from '@nestjs/common';
import type { AuthUserPayload } from '../../../../../decorators/current-user.decorator';
import type { Application } from '../../../../../models/entities/application.entity';
import {
  BusinessAuditAction,
  BusinessAuditLogService,
} from '../../../audit-logs/services/business-audit-log.service';
import { SpaceAccessService } from '../../../groups/services/access/space-access.service';
import type { CreateApplicationDto } from '../../dto/applications.dto';
import { ApplicationCreationService } from '../creation/application-creation.service';
import { TransactionService } from '../../../../transaction';

/**
 * ログインユーザーの申請作成を space access と監査ログ付きで実行する use case service。
 */
@Injectable()
export class ApplicationCreationUseCaseService {
  constructor(
    private readonly spaceAccess: SpaceAccessService,
    private readonly creationService: ApplicationCreationService,
    private readonly auditLogs: BusinessAuditLogService,
    private readonly transactions: TransactionService,
  ) {}

  /**
   * space 利用権限を検証し、申請作成と作成監査ログ記録を同一 transaction で実行する。
   * @param actor ログインユーザー
   * @param dto 申請作成DTO
   * @returns 作成された申請
   */
  async create(
    actor: AuthUserPayload,
    dto: CreateApplicationDto,
  ): Promise<Application> {
    await this.spaceAccess.assertCanUseGroup(actor, dto.groupId);
    return this.transactions.run(async (manager) => {
      const created = await this.creationService.create(
        actor.tenantId,
        actor.email,
        actor.id,
        dto,
        manager,
      );
      await this.auditLogs.recordApplicationEvent(
        {
          actionType: BusinessAuditAction.APPLICATION_CREATED,
          actor: { id: actor.id, email: actor.email, type: 'user' },
          app: created,
          after: {
            status: created.status,
            stepOrder: created.currentStepOrder,
          },
        },
        manager,
      );
      return created;
    });
  }
}
