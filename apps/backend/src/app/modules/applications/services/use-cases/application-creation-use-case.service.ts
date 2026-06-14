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

@Injectable()
export class ApplicationCreationUseCaseService {
  constructor(
    private readonly spaceAccess: SpaceAccessService,
    private readonly creationService: ApplicationCreationService,
    private readonly auditLogs: BusinessAuditLogService,
    private readonly transactions: TransactionService,
  ) {}

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
