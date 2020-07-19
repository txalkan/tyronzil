/*
    TyronZIL-js: Decentralized identity client for the Zilliqa blockchain platform
    Copyright (C) 2020 Julio Cesar Cabrapan Duarte

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.
*/

import PublicKeyModel from "@decentralized-identity/sidetree/dist/lib/core/versions/latest/models/PublicKeyModel";
import ServiceEndpointModel from "@decentralized-identity/sidetree/dist/lib/core/versions/latest/models/ServiceEndpointModel";
import DocumentModel from "@decentralized-identity/sidetree/dist/lib/core/versions/latest/models/DocumentModel";

export interface PatchModel {
    action: PatchAction;
    /** If the action is `remove-public-keys`, then Patch.publicKeys MUST be an array of PublicKeyModel.id strings */
    publicKeys?: PublicKeyModel[] | string[];
    serviceEndpoints?: ServiceEndpointModel;
    /** If the action is `remove-service-endpoints`, then Patch.ids MUST be an array of DidServiceEndpointModel.id strings */
    ids?: string[];
    document?: DocumentModel;
}

export enum PatchAction {
    AddKeys = 'add-public-keys',
    RemoveKeys = 'remove-public-keys',
    AddServices = 'add-service-endpoints',
    RemoveServices = 'remove-service-endpoints',
    /** Acts as a complete state reset that replaces a DID's current PKI metadata with the state provided - also used to create new DIDs */
    Replace = 'replace',
    // Format of an additional custom action
    CustomAction = '-custom-action',
}
