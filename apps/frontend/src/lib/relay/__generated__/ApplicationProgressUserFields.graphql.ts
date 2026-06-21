/**
 * @generated SignedSource<<066786fb11bcb55ebdfb48a226648e2b>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import type { ReaderFragment } from 'relay-runtime';
import type { FragmentRefs } from "relay-runtime";
export type ApplicationProgressUserFields$data = {
  readonly email: string;
  readonly id: string;
  readonly name: string | null | undefined;
  readonly " $fragmentType": "ApplicationProgressUserFields";
};
export type ApplicationProgressUserFields$key = {
  readonly " $data"?: ApplicationProgressUserFields$data;
  readonly " $fragmentSpreads": FragmentRefs<"ApplicationProgressUserFields">;
};

const node: ReaderFragment = {
  "argumentDefinitions": [],
  "kind": "Fragment",
  "metadata": null,
  "name": "ApplicationProgressUserFields",
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
      "name": "email",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "name",
      "storageKey": null
    }
  ],
  "type": "ApplicationProgressUser",
  "abstractKey": null
};

(node as any).hash = "56fe22f6bb9c6cd72991b2269d856ead";

export default node;
