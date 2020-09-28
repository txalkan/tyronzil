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

import * as zcrypto from '@zilliqa-js/crypto';

import { Cryptography } from '../../util/did-keys';
import Multihash from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/Multihash';
import Encoder from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/Encoder';
import OperationType from '@decentralized-identity/sidetree/dist/lib/core/enums/OperationType';
import { PatchModel, DocumentModel } from '../models/patch-model';
import { SignedDataRequest, UpdateSignedDataModel } from '../models/signed-data-models';
import DidState from '../../did-state';
import { DeltaModel, Sidetree } from '../sidetree';

/** Generates a Sidetree-Tyron `DID-Update` operation */
export default class DidUpdate{
    public readonly type = OperationType.Update;
    public readonly decentralized_identifier: string;
    public readonly newDocument: DocumentModel;
    public readonly newUpdateKey: string;
    public readonly signedRequest: SignedDataRequest;
    public readonly privateKey?: string[];
    public readonly newUpdatePrivateKey: string;
    
    private constructor (
        operation: UpdateOperationModel
    ) {
        this.decentralized_identifier = operation.did;
        this.signedRequest = operation.signedRequest;
        this.newDocument = operation.newDocument;
        this.newUpdateKey = operation.newUpdateKey;
        this.privateKey = operation.privateKey;
        this.newUpdatePrivateKey = operation.newUpdatePrivateKey;
    }

    /***            ****            ***/
    
    /** Generates a Sidetree-based `DID-Update` operation with input from the CLI */
    public static async execute(input: UpdateOperationInput): Promise<DidUpdate> {
        const operation = await Sidetree.processPatches(input.patches, input.state.did_document)
        .then(async update => {
            // Generates key-pair for the next DID-Update operation
            const [NEW_UPDATE_KEY, NEW_UPDATE_PRIVATE_KEY] = await Cryptography.keyPair();

            /** Input data for the Sidetree-Tyron request */
            const REQUEST_INPUT: RequestInput = {
                did: input.state.decentralized_identifier,
                updatePrivateKey: input.updatePrivateKey,
                newUpdateKey: NEW_UPDATE_KEY,
                patches: update.patches
            };

            /** Sidetree-Tyron data to generate a `DID-Update` operation */
            const REQUEST = await DidUpdate.sidetreeTyronRequest(REQUEST_INPUT);
            
            /** Output data from a Sidetree-Tyron `DID-Update` operation */
            const OPERATION_OUTPUT: UpdateOperationModel = {
                did: input.state.decentralized_identifier,
                signedRequest: REQUEST,
                newDocument: update.doc,
                newUpdateKey: NEW_UPDATE_KEY,
                newUpdatePrivateKey: NEW_UPDATE_PRIVATE_KEY,
                privateKey: update.privateKey
            };
            return new DidUpdate(OPERATION_OUTPUT);
        })
        .catch(err => { throw err })
        return operation;
    }

    /***            ****            ***/

    /** Generates the Sidetree-Tyron data for the `DID-Update` operation (Tyron Protocol) */
    public static async sidetreeTyronRequest(input: RequestInput): Promise<SignedDataRequest> {
        
        /** The Update Operation Delta Object */
        const DELTA_OBJECT: DeltaModel = {
            patches: input.patches,
            update_key: input.newUpdateKey
        };
        const DELTA_BUFFER = Buffer.from(JSON.stringify(DELTA_OBJECT));
        const DELTA = Encoder.encode(DELTA_BUFFER);
        const DELTA_HASH = Encoder.encode(Multihash.hash(DELTA_BUFFER));
        const PREVIOUS_UPDATE_KEY = zcrypto.getPubKeyFromPrivateKey(input.updatePrivateKey);

        /** For the Update Operation Signed Data Object */
        const SIGNED_DATA: UpdateSignedDataModel = {
            decentralized_identifier: input.did,
            delta_hash: DELTA_HASH,
            previous_update_key: PREVIOUS_UPDATE_KEY
        };
        const ENCODED_SIGNED_DATA = Encoder.encode(JSON.stringify(SIGNED_DATA))
        const DATA_BUFFER = Buffer.from(ENCODED_SIGNED_DATA);

        const SIGNATURE = zcrypto.sign(DATA_BUFFER, input.updatePrivateKey, PREVIOUS_UPDATE_KEY);

        /** Data to execute a `DID-Update` operation */
        const SIGNED_REQUEST: SignedDataRequest = {
            type: OperationType.Update,
            signed_data: ENCODED_SIGNED_DATA,
            signature: SIGNATURE,
            delta: DELTA
        };
        return SIGNED_REQUEST;
    }
}

/***            ** interfaces **            ***/

/** Defines input data for a Sidetree-Tyron `DID-Update` operation */
export interface UpdateOperationInput {
    state: DidState;
    updatePrivateKey: string;
    patches: PatchModel[];
}

/** Defines output data of a Sidetree-Tyron `DID-Update` operation */
interface UpdateOperationModel {
    did: string;
    signedRequest: SignedDataRequest;
    newDocument: DocumentModel;
    newUpdateKey: string;
    privateKey?: string[];
    newUpdatePrivateKey: string;
}

/** Defines input data for a Sidetree-Tyron `DID-Update` operation REQUEST*/
interface RequestInput {
    did: string;
    updatePrivateKey: string;
    newUpdateKey: string;
    patches: PatchModel[];
}
