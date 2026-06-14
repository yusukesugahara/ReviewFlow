import { Injectable, Optional } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';

export type TransactionManager = EntityManager;

@Injectable()
export class TransactionService {
  constructor(
    @Optional()
    private readonly dataSource?: DataSource,
  ) {}

  /**
   * 複数テーブルの更新と監査ログを同じ DB transaction にまとめる。
   * callback に渡される manager を repository/service に引き回すことで、
   * 取得・更新・監査ログ作成が同一 transaction 上で実行される。
   */
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
