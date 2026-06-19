/**
 * @generated SignedSource<<421f421d303e204b1a4b9e66a8cecfcf>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import type { ReaderFragment } from 'relay-runtime';
import type { FragmentRefs } from "relay-runtime";
export type ApplicationSummaryFields$data = {
  readonly applicantEmail: string;
  readonly applicantUserId: string | null | undefined;
  readonly applicationName: string;
  readonly approvalFlowId: string;
  readonly createdAt: string;
  readonly currentStepAssigneeUserIds: ReadonlyArray<string>;
  readonly currentStepOrder: number | null | undefined;
  readonly databaseId: string;
  readonly formDefinitionId: string;
  readonly formDefinitionName: string;
  readonly groupId: string;
  readonly relayId: string;
  readonly status: string;
  readonly submittedAt: string | null | undefined;
  readonly updatedAt: string;
  readonly " $fragmentType": "ApplicationSummaryFields";
};
export type ApplicationSummaryFields$key = {
  readonly " $data"?: ApplicationSummaryFields$data;
  readonly " $fragmentSpreads": FragmentRefs<"ApplicationSummaryFields">;
};

const node: ReaderFragment = {
  "argumentDefinitions": [],
  "kind": "Fragment",
  "metadata": null,
  "name": "ApplicationSummaryFields",
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
    }
  ],
  "type": "ApplicationSummary",
  "abstractKey": null
};

(node as any).hash = "bdd9f7a1fed89e7086b5023f85410bb1";

export default node;
