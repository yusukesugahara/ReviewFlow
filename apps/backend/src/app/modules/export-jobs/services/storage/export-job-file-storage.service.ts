import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Injectable } from '@nestjs/common';

/**
 * エクスポート CSV ファイルのローカル保存・読み込みを扱う storage service。
 */
@Injectable()
export class ExportJobFileStorage {
  /**
   * CSV 文字列を job ごとのファイルに保存する。
   * @param params 保存パラメータ
   * @returns 保存先ファイルパス
   */
  writeCsv(params: { tenantId: string; jobId: string; csv: string }): string {
    const outputPath = this.buildOutputPath(params.tenantId, params.jobId);
    mkdirSync(join(outputPath, '..'), { recursive: true });
    writeFileSync(outputPath, params.csv, 'utf8');
    return outputPath;
  }

  /**
   * ファイルが存在するか確認する。
   * @param filePath ファイルパス
   * @returns 存在するか
   */
  exists(filePath: string): boolean {
    return existsSync(filePath);
  }

  /**
   * ファイルを Buffer として読み込む。
   * @param filePath ファイルパス
   * @returns ファイル内容
   */
  read(filePath: string): Buffer {
    return readFileSync(filePath);
  }

  /**
   * tenant / job 単位の CSV 保存先を組み立てる。
   * @param tenantId テナントID
   * @param jobId エクスポートジョブID
   * @returns 保存先ファイルパス
   */
  private buildOutputPath(tenantId: string, jobId: string): string {
    return join(process.cwd(), 'var', 'exports', tenantId, `${jobId}.csv`);
  }
}
