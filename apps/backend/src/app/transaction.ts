import { Injectable, Optional } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';

export type TransactionManager = EntityManager;

@Injectable()
export class TransactionService {
  constructor(
    @Optional()
    private readonly dataSource?: DataSource,
  ) {}

  async run<T>(
    work: (manager: TransactionManager | undefined) => Promise<T>,
  ): Promise<T> {
    if (!this.dataSource) {
      if (process.env.NODE_ENV !== 'test') {
        throw new Error('DataSource is required to run a transactional write');
      }
      return work(undefined);
    }
    return this.dataSource.transaction((manager) => work(manager));
  }
}
