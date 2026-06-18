import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../../models/entities/user.entity';
import { UsersRepository } from '../../../models/repositories/users.repository';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { UsersController } from './controllers/users.controller';
import { UsersBusinessGraphqlResolver } from './graphql/users-business.graphql.resolver';
import { UsersRelayGraphqlResolver } from './graphql/users-relay.graphql.resolver';
import { UsersService } from './services/users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User]), AuditLogsModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    UsersBusinessGraphqlResolver,
    UsersRelayGraphqlResolver,
    UsersRepository,
  ],
  exports: [UsersService],
})
export class UsersModule {}
