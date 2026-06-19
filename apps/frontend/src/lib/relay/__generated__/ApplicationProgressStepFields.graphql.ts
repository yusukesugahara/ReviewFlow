/**
 * @generated SignedSource<<79a5981756378bffe7509df51d09c843>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import type { ReaderFragment } from 'relay-runtime';
import type { FragmentRefs } from "relay-runtime";
export type ApplicationProgressStepFields$data = {
  readonly actions: ReadonlyArray<{
    readonly " $fragmentSpreads": FragmentRefs<"ApplicationProgressActionFields">;
  }>;
  readonly assignees: ReadonlyArray<{
    readonly " $fragmentSpreads": FragmentRefs<"ApplicationProgressUserFields">;
  }>;
  readonly canReturn: boolean;
  readonly id: string;
  readonly status: string;
  readonly stepName: string;
  readonly stepOrder: number;
  readonly " $fragmentType": "ApplicationProgressStepFields";
};
export type ApplicationProgressStepFields$key = {
  readonly " $data"?: ApplicationProgressStepFields$data;
  readonly " $fragmentSpreads": FragmentRefs<"ApplicationProgressStepFields">;
};

const node: ReaderFragment = {
  "argumentDefinitions": [],
  "kind": "Fragment",
  "metadata": null,
  "name": "ApplicationProgressStepFields",
  "selections": [
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "id",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "stepOrder",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "stepName",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "canReturn",
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
      "concreteType": "ApplicationProgressUser",
      "kind": "LinkedField",
      "name": "assignees",
      "plural": true,
      "selections": [
        {
          "args": null,
          "kind": "FragmentSpread",
          "name": "ApplicationProgressUserFields"
        }
      ],
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "concreteType": "ApplicationProgressAction",
      "kind": "LinkedField",
      "name": "actions",
      "plural": true,
      "selections": [
        {
          "args": null,
          "kind": "FragmentSpread",
          "name": "ApplicationProgressActionFields"
        }
      ],
      "storageKey": null
    }
  ],
  "type": "ApplicationProgressStep",
  "abstractKey": null
};

(node as any).hash = "c7a557677a6da519f6ef9944122a9f58";

export default node;
