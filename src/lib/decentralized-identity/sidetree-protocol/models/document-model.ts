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

import { PublicKeyModel } from './verification-method-models';
import { PublicKeyInput } from '../../../../bin/util';

export interface DocumentModel {
    public_keys: any;
    service_endpoints?: DidServiceEndpointModel[]; 
}

/** Sidetreee Service Endpoint for the 'service' property of the DID-Document */
export interface DidServiceEndpointModel {
    id: string;
    type: string;
    endpoint: string;
}

export interface PatchModel {
    action: PatchAction;
    document?: DocumentModel;
    public_keys?: PublicKeyModel[] | string[]; // array of id strings to remove keys
    /** If the action is 'remove-service-endpoints`, then 'ids' MUST be an array of the services to remove */
    ids?: string [];
    keyInput?: PublicKeyInput[];
    service_endpoints?: DidServiceEndpointModel[];
}

export enum PatchAction {
    AddKeys = 'add-public-keys',
    RemoveKeys = 'remove-public-keys',
    AddServices = 'add-service-endpoints',
    RemoveServices = 'remove-service-endpoints',
    // Format of an additional custom action
    CustomAction = '-custom-action',
}
