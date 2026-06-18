import {
  FORM_DEFINITION_RELAY_NODE_TYPE,
  toRelayGlobalId,
} from '../../../../common/graphql/relay-id';
import type { FormDefinitionResponseDto } from '../dto/form-definitions.dto';
import type { FormDefinitionGql } from './form-definitions.graphql.types';

export function toFormDefinitionGql(
  definition: FormDefinitionResponseDto,
): FormDefinitionGql {
  return {
    __typename: 'FormDefinition',
    ...definition,
    id: toRelayGlobalId(FORM_DEFINITION_RELAY_NODE_TYPE, definition.id),
    databaseId: definition.id,
  };
}
