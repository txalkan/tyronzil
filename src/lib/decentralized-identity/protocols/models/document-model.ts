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

import { PublicKeyInput } from '../../../../bin/util';
import { TransitionValue } from '../../../blockchain/tyronzil';

export interface DocumentModel {
    public_keys: any;
    service_endpoints?: DidServiceEndpointModel[]; 
}

export enum DocumentElement {
    VerificationMethod = "key",
    Service = "service"
}

export interface ServiceModel {
    id: string;
    type: string;
    transferProtocol: DataTransferProtocol;
    uri: string
}

export enum Action {
    Adding = "Add",
    Removing = "Remove"
}

export enum DataTransferProtocol {
    Https = "Https",
    Git = "Git",
    Ssh = "Ssh"
}

/** Sidetreee Service Endpoint for the 'service' property of the DID-Document */
export interface DidServiceEndpointModel {
    id: string;
    type: string;
    endpoint: string;
}

export interface PatchModel {
    action: PatchAction;
    ids?: string[];        //the IDs of the DID-Document elements to remove
    keyInput?: PublicKeyInput[];
    services?: TransitionValue[];
}

export enum PatchAction {
    AddKeys = 'add-public-keys',
    RemoveKeys = 'remove-public-keys',
    AddServices = 'add-service-endpoints',
    RemoveServices = 'remove-service-endpoints',
    // Format of an additional custom action
    CustomAction = '-custom-action',
}
