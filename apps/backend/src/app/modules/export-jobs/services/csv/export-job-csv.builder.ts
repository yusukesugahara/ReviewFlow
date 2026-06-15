import { Injectable } from '@nestjs/common';
import { Application } from '../../../../../models/entities/application.entity';

/**
 * 申請一覧を CSV エクスポート本文へ変換する builder。
 */
@Injectable()
export class ExportJobCsvBuilder {
  /**
   * 固定列とフォームフィールド列を組み合わせて CSV を生成する。
   * @param rows エクスポート対象申請
   * @returns CSV 文字列
   */
  build(rows: Application[]): string {
    const baseColumns = [
      'applicationId',
      'status',
      'submittedAt',
      'createdAt',
      'updatedAt',
      'applicantEmail',
      'formDefinitionName',
      'approvalFlowId',
      'currentStepOrder',
    ];
    const dynamicColumns = this.collectFieldKeys(rows);
    const columns = [...baseColumns, ...dynamicColumns];
    const lines: string[] = [columns.map((c) => this.csvEscape(c)).join(',')];

    for (const row of rows) {
      const valuesByKey = new Map<string, unknown>();
      for (const value of row.fieldValues ?? []) {
        const key = value.formField?.fieldKey;
        if (key) {
          valuesByKey.set(key, value.valueJson);
        }
      }

      const record: unknown[] = [
        row.id,
        row.status,
        row.submittedAt ? row.submittedAt.toISOString() : '',
        row.createdAt.toISOString(),
        row.updatedAt.toISOString(),
        row.applicantEmail,
        row.formDefinition?.name ?? '',
        row.approvalFlowId,
        row.currentStepOrder ?? '',
      ];
      for (const key of dynamicColumns) {
        record.push(valuesByKey.has(key) ? valuesByKey.get(key) : '');
      }
      lines.push(record.map((value) => this.csvEscape(value)).join(','));
    }

    return `${lines.join('\n')}\n`;
  }

  /**
   * エクスポート対象申請のフォーム定義から動的列 fieldKey を収集する。
   * @param rows エクスポート対象申請
   * @returns fieldKey 一覧
   */
  private collectFieldKeys(rows: Application[]): string[] {
    const fieldKeys = new Set<string>();
    for (const row of rows) {
      for (const field of row.formDefinition?.fields ?? []) {
        fieldKeys.add(field.fieldKey);
      }
    }
    return [...fieldKeys].sort((a, b) => a.localeCompare(b));
  }

  /**
   * CSV セル値を文字列化し、必要に応じてエスケープする。
   * @param value セル値
   * @returns CSV セル文字列
   */
  private csvEscape(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }
    let text = '';
    if (typeof value === 'string') {
      text = value;
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      text = String(value);
    } else {
      text = JSON.stringify(value);
    }
    if (/[",\n\r]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  }
}
