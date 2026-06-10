import { Injectable } from '@nestjs/common';
import { Application } from '../../../../models/entities/application.entity';

@Injectable()
export class ExportJobCsvBuilder {
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

  private collectFieldKeys(rows: Application[]): string[] {
    const fieldKeys = new Set<string>();
    for (const row of rows) {
      for (const field of row.formDefinition?.fields ?? []) {
        fieldKeys.add(field.fieldKey);
      }
    }
    return [...fieldKeys].sort((a, b) => a.localeCompare(b));
  }

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
