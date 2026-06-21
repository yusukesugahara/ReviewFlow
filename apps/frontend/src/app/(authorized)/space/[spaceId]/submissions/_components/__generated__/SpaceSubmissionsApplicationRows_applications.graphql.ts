/**
 * @generated SignedSource<<0054dbd9db5add2a713ae40722ede3bb>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import type { ReaderFragment } from 'relay-runtime';
import type { FragmentRefs } from "relay-runtime";
export type SpaceSubmissionsApplicationRows_applications$data = ReadonlyArray<{
  readonly applicantEmail: string;
  readonly applicantUserId: string | null | undefined;
  readonly applicationName: string;
  readonly createdAt: string;
  readonly currentStepAssigneeUserIds: ReadonlyArray<string>;
  readonly databaseId: string;
  readonly formDefinitionId: string;
  readonly formDefinitionName: string;
  readonly groupId: string;
  readonly relayId: string;
  readonly status: string;
  readonly updatedAt: string;
  readonly " $fragmentType": "SpaceSubmissionsApplicationRows_applications";
}>;
export type SpaceSubmissionsApplicationRows_applications$key = ReadonlyArray<{
  readonly " $data"?: SpaceSubmissionsApplicationRows_applications$data;
  readonly " $fragmentSpreads": FragmentRefs<"SpaceSubmissionsApplicationRows_applications">;
}>;

const node: ReaderFragment = {
  "argumentDefinitions": [],
  "kind": "Fragment",
  "metadata": {
    "plural": true
  },
  "name": "SpaceSubmissionsApplicationRows_applications",
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
      "name": "currentStepAssigneeUserIds",
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

(node as any).hash = "0373b72d1e562a5828f31cc8c26e1147";

export default node;
