import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../models/entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  count(): Promise<number> {
    return this.users.count();
  }

  findById(id: string): Promise<User | null> {
    return this.users.findOne({ where: { id } });
  }

  findAllByEmail(email: string): Promise<User[]> {
    return this.users.find({
      where: { email: email.toLowerCase() },
    });
  }

  findByTenantAndEmail(
    tenantId: string,
    email: string,
  ): Promise<User | null> {
    return this.users.findOne({
      where: { tenantId, email: email.toLowerCase() },
    });
  }
}
