import { Injectable } from '@nestjs/common';
import { AuditLogsRepository } from '../../../../models/repositories/audit-logs.repository';
import type { AuditLogsQueryDto } from '../dto/audit-logs.dto';
import { mapAuditLogToDto } from '../mappers/audit-logs.mapper';

/**
 * tenant 管理者向け監査ログ一覧を取得する service。
 */
@Injectable()
export class AuditLogsService {
  constructor(private readonly auditLogsRepository: AuditLogsRepository) {}

  /**
   * tenant scope 内の監査ログを検索条件付きで取得し、DTOへ変換する。
   * @param tenantId テナントID
   * @param query 監査ログ検索条件
   * @returns 監査ログ一覧レスポンス
   */
  async listByTenant(tenantId: string, query: AuditLogsQueryDto) {
    const result = await this.auditLogsRepository.listByTenant(tenantId, query);
    return {
      logs: result.rows.map(mapAuditLogToDto),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
    };
  }

  /**
   * tenant scope 内の監査ログを1件取得し、DTOへ変換する。
   * @param tenantId テナントID
   * @param id 監査ログID
   * @returns 監査ログ。存在しなければ null。
   */
  async getOneByTenant(tenantId: string, id: string) {
    const row = await this.auditLogsRepository.findOneByIdInTenant(
      tenantId,
      id,
    );
    return row ? mapAuditLogToDto(row) : null;
  }
}
