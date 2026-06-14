import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ExportJobFileStorage {
  writeCsv(params: { tenantId: string; jobId: string; csv: string }): string {
    const outputPath = this.buildOutputPath(params.tenantId, params.jobId);
    mkdirSync(join(outputPath, '..'), { recursive: true });
    writeFileSync(outputPath, params.csv, 'utf8');
    return outputPath;
  }

  exists(filePath: string): boolean {
    return existsSync(filePath);
  }

  read(filePath: string): Buffer {
    return readFileSync(filePath);
  }

  private buildOutputPath(tenantId: string, jobId: string): string {
    return join(process.cwd(), 'var', 'exports', tenantId, `${jobId}.csv`);
  }
}
