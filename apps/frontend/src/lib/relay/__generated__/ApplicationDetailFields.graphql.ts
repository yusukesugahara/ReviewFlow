/**
 * @generated SignedSource<<b52320d9d430430bfa7ea9fa17ac30ea>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import type { ReaderFragment } from 'relay-runtime';
import type { FragmentRefs } from "relay-runtime";
export type ApplicationDetailFields$data = {
  readonly applicantEmail: string;
  readonly applicantUserId: string | null | undefined;
  readonly applicationName: string;
  readonly approvalFlowId: string;
  readonly approvalProgress: ReadonlyArray<{
    readonly " $fragmentSpreads": FragmentRefs<"ApplicationProgressStepFields">;
  }>;
  readonly capabilities: {
    readonly " $fragmentSpreads": FragmentRefs<"ApplicationCapabilitiesFields">;
  };
  readonly createdAt: string;
  readonly currentStepAssigneeUserIds: ReadonlyArray<string>;
  readonly currentStepCanReturn: boolean | null | undefined;
  readonly currentStepOrder: number | null | undefined;
  readonly databaseId: string;
  readonly formDefinitionId: string;
  readonly formDefinitionName: string;
  readonly groupId: string;
  readonly relayId: string;
  readonly status: string;
  readonly submittedAt: string | null | undefined;
  readonly updatedAt: string;
  readonly values: unknown;
  readonly " $fragmentType": "ApplicationDetailFields";
};
export type ApplicationDetailFields$key = {
  readonly " $data"?: ApplicationDetailFields$data;
  readonly " $fragmentSpreads": FragmentRefs<"ApplicationDetailFields">;
};

const node: ReaderFragment = {
  "argumentDefinitions": [],
  "kind": "Fragment",
  "metadata": null,
  "name": "ApplicationDetailFields",
  "selections": [
    {
      "alias": "relayId",
      "args": null,
      "kind": "ScalarField",
      "name": "id",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "databaseId",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "groupId",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "status",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "approvalFlowId",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "formDefinitionId",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "formDefinitionName",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "applicationName",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "applicantEmail",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "applicantUserId",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "currentStepOrder",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "currentStepAssigneeUserIds",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "submittedAt",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "createdAt",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "updatedAt",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "currentStepCanReturn",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "values",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "concreteType": "ApplicationCapabilities",
      "kind": "LinkedField",
      "name": "capabilities",
      "plural": false,
      "selections": [
        {
          "args": null,
          "kind": "FragmentSpread",
          "name": "ApplicationCapabilitiesFields"
        }
      ],
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "concreteType": "ApplicationProgressStep",
      "kind": "LinkedField",
      "name": "approvalProgress",
      "plural": true,
      "selections": [
        {
          "args": null,
          "kind": "FragmentSpread",
          "name": "ApplicationProgressStepFields"
        }
      ],
      "storageKey": null
    }
  ],
  "type": "ApplicationDetail",
  "abstractKey": null
};

(node as any).hash = "22d260ff8a3c97d5f1206ef5ef43802b";

export default node;
