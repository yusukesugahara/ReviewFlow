import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApplicantAccessGuard } from '../app/guards/applicant-access.guard';
import { InternalApiKeyGuard } from '../app/guards/internal-api-key.guard';
import { JwtAuthGuard } from '../app/guards/jwt-auth.guard';
import { RolesGuard } from '../app/guards/roles.guard';
import { ApplicationsController } from '../app/modules/applications/controllers/applications.controller';
import { PublicApplicationsController } from '../app/modules/applications/controllers/public-applications.controller';
import { ApplicationsService } from '../app/modules/applications/services/facades/applications.service';
import { ApprovalFlowsController } from '../app/modules/approval-flows/controllers/approval-flows.controller';
import { ApprovalFlowsService } from '../app/modules/approval-flows/services/approval-flows.service';
import { AuditLogsController } from '../app/modules/audit-logs/controllers/audit-logs.controller';
import { AuditLogsService } from '../app/modules/audit-logs/services/audit-logs.service';
import { AuthController } from '../app/modules/auth/controllers/auth.controller';
import { AuthService } from '../app/modules/auth/services/facades/auth.service';
import { ExportJobsController } from '../app/modules/export-jobs/controllers/export-jobs.controller';
import { ExportJobsService } from '../app/modules/export-jobs/services/facades/export-jobs.service';
import { FormDefinitionsController } from '../app/modules/form-definitions/controllers/form-definitions.controller';
import { FormDefinitionsService } from '../app/modules/form-definitions/services/facades/form-definitions.service';
import { GroupsController } from '../app/modules/groups/controllers/groups.controller';
import { GroupsService } from '../app/modules/groups/services/facades/groups.service';
import { InvitationsController } from '../app/modules/invitations/controllers/invitations.controller';
import { InvitationsService } from '../app/modules/invitations/services/invitations.service';
import { UsersController } from '../app/modules/users/controllers/users.controller';
import { UsersService } from '../app/modules/users/services/users.service';

const openApiProviderStub = {};

@Module({
  controllers: [
    UsersController,
    AuthController,
    AuditLogsController,
    InvitationsController,
    FormDefinitionsController,
    ApprovalFlowsController,
    GroupsController,
    ApplicationsController,
    PublicApplicationsController,
    ExportJobsController,
  ],
  providers: [
    { provide: ApplicationsService, useValue: openApiProviderStub },
    { provide: ApprovalFlowsService, useValue: openApiProviderStub },
    { provide: AuditLogsService, useValue: openApiProviderStub },
    { provide: AuthService, useValue: openApiProviderStub },
    { provide: ExportJobsService, useValue: openApiProviderStub },
    { provide: FormDefinitionsService, useValue: openApiProviderStub },
    { provide: GroupsService, useValue: openApiProviderStub },
    { provide: InvitationsService, useValue: openApiProviderStub },
    { provide: UsersService, useValue: openApiProviderStub },
    { provide: ApplicantAccessGuard, useValue: openApiProviderStub },
    { provide: InternalApiKeyGuard, useValue: openApiProviderStub },
    { provide: JwtAuthGuard, useValue: openApiProviderStub },
    { provide: RolesGuard, useValue: openApiProviderStub },
    { provide: ConfigService, useValue: openApiProviderStub },
  ],
})
export class OpenApiEmitterModule {}
