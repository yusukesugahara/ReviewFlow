import {
  EXPORT_JOB_RELAY_NODE_TYPE,
  toRelayGlobalId,
} from '../../../../common/graphql/relay-id';
import type { ExportJobResponseDto } from '../dto/export-jobs.dto';
import type { ExportJobGql } from './export-jobs.graphql.types';

export function toExportJobGql(job: ExportJobResponseDto): ExportJobGql {
  return {
    __typename: 'ExportJob',
    ...job,
    id: toRelayGlobalId(EXPORT_JOB_RELAY_NODE_TYPE, job.id),
    databaseId: job.id,
  };
}
