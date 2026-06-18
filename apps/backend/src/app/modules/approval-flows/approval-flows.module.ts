import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApprovalFlow } from '../../../models/entities/approval-flow.entity';
import { ApprovalStep } from '../../../models/entities/approval-step.entity';
import { GroupMember } from '../../../models/entities/group-member.entity';
import { User } from '../../../models/entities/user.entity';
import { ApprovalFlowsRepository } from '../../../models/repositories/approval-flows.repository';
import { GroupsModule } from '../groups/groups.module';
import { ApprovalFlowsController } from './controllers/approval-flows.controller';
import { ApprovalFlowsBusinessGraphqlResolver } from './graphql/approval-flows-business.graphql.resolver';
import { ApprovalFlowsRelayGraphqlResolver } from './graphql/approval-flows-relay.graphql.resolver';
import { ApprovalFlowMutationService } from './services/approval-flow-mutation.service';
import { ApprovalFlowsService } from './services/approval-flows.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ApprovalFlow, ApprovalStep, GroupMember, User]),
    GroupsModule,
  ],
  controllers: [ApprovalFlowsController],
  providers: [
    ApprovalFlowsService,
    ApprovalFlowsBusinessGraphqlResolver,
    ApprovalFlowsRelayGraphqlResolver,
    ApprovalFlowMutationService,
    ApprovalFlowsRepository,
  ],
  exports: [ApprovalFlowsService],
})
export class ApprovalFlowsModule {}
