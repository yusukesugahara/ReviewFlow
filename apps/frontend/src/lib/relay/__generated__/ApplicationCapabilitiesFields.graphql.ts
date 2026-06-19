/**
 * @generated SignedSource<<ee80f96cc0b2296d3d20e98858ba8d6b>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import type { ReaderFragment } from 'relay-runtime';
import type { FragmentRefs } from "relay-runtime";
export type ApplicationCapabilitiesFields$data = {
  readonly canApproveApplication: boolean;
  readonly canEditApplication: boolean;
  readonly canRejectApplication: boolean;
  readonly canResubmitApplication: boolean;
  readonly canReturnApplication: boolean;
  readonly canSubmitApplication: boolean;
  readonly " $fragmentType": "ApplicationCapabilitiesFields";
};
export type ApplicationCapabilitiesFields$key = {
  readonly " $data"?: ApplicationCapabilitiesFields$data;
  readonly " $fragmentSpreads": FragmentRefs<"ApplicationCapabilitiesFields">;
};

const node: ReaderFragment = {
  "argumentDefinitions": [],
  "kind": "Fragment",
  "metadata": null,
  "name": "ApplicationCapabilitiesFields",
  "selections": [
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "canEditApplication",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "canSubmitApplication",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "canResubmitApplication",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "canApproveApplication",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "canRejectApplication",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "canReturnApplication",
      "storageKey": null
    }
  ],
  "type": "ApplicationCapabilities",
  "abstractKey": null
};

(node as any).hash = "d6b32a6da0b66627f7943e6bd819c8b0";

export default node;
