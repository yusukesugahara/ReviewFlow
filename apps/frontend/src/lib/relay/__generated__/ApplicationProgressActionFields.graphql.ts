/**
 * @generated SignedSource<<86d803e336523154ef9e5242b77831b4>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import type { ReaderFragment } from 'relay-runtime';
import type { FragmentRefs } from "relay-runtime";
export type ApplicationProgressActionFields$data = {
  readonly actedAt: string;
  readonly actedBy: {
    readonly " $fragmentSpreads": FragmentRefs<"ApplicationProgressUserFields">;
  };
  readonly action: string;
  readonly comment: string | null | undefined;
  readonly id: string;
  readonly " $fragmentType": "ApplicationProgressActionFields";
};
export type ApplicationProgressActionFields$key = {
  readonly " $data"?: ApplicationProgressActionFields$data;
  readonly " $fragmentSpreads": FragmentRefs<"ApplicationProgressActionFields">;
};

const node: ReaderFragment = {
  "argumentDefinitions": [],
  "kind": "Fragment",
  "metadata": null,
  "name": "ApplicationProgressActionFields",
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
      "name": "action",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "comment",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "actedAt",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "concreteType": "ApplicationProgressUser",
      "kind": "LinkedField",
      "name": "actedBy",
      "plural": false,
      "selections": [
        {
          "args": null,
          "kind": "FragmentSpread",
          "name": "ApplicationProgressUserFields"
        }
      ],
      "storageKey": null
    }
  ],
  "type": "ApplicationProgressAction",
  "abstractKey": null
};

(node as any).hash = "e837dbed3dc06de9fd66b56a180f63f6";

export default node;
