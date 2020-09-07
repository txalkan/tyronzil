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

import JwkEs256k from '@decentralized-identity/sidetree/dist/lib/core/models/JwkEs256k';
import { Cryptography } from '../../util/did-keys';
import Multihash from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/Multihash';
import Encoder from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/Encoder';
import OperationType from '@decentralized-identity/sidetree/dist/lib/core/enums/OperationType';
import UpdateOperation from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/UpdateOperation';
import { PatchModel } from '../models/patch-model';
import { UpdateSignedDataModel } from '../models/signed-data-models';
import DidState from '../../did-state';
import { Sidetree } from '../sidetree';

/** Generates a Sidetree-based `DID-update` operation */
export default class DidUpdate{
    public readonly type: OperationType.Update;
    public readonly did_tyronZIL: string;
    public readonly newUpdateCommitment: string;
    public readonly sidetreeRequest: Buffer;
    /** The result from the Sidetree request */
    public readonly updateOperation: UpdateOperation;
    /** The encoded Delta Object */
    public readonly delta: string;
    public readonly privateKey?: string[];
    public readonly updatePrivateKey: JwkEs256k;
    
    private constructor (
        operation: UpdateOperationModel
    ) {
        this.type = OperationType.Update;
        this.did_tyronZIL = operation.did_tyronZIL;
        this.newUpdateCommitment = operation.newUpdateCommitment;
        this.sidetreeRequest = operation.sidetreeRequest;
        this.updateOperation = operation.updateOperation;
        this.delta = this.updateOperation.encodedDelta!;
        this.privateKey = operation.privateKey;
        this.updatePrivateKey = operation.newUpdatePrivateKey;
    }

    /***            ****            ***/
    
    /** Generates a Sidetree-based `DID-update` operation with input from the CLI */
    public static async execute(input: UpdateOperationInput): Promise<DidUpdate|void> {
        const did_executed = await Sidetree.processPatches(input.patches, input.state.document!)
        .then(async update => {
            // Creates key-pair for the updateCommitment (save private key for next update operation)
            const [NEW_UPDATE_KEY, NEW_UPDATE_PRIVATE_KEY] = await Cryptography.jwkPair();
            /** Utilizes the UPDATE_KEY to make the `update reveal value` for the next update operation */
            const NEW_UPDATE_COMMITMENT = Multihash.canonicalizeThenHashThenEncode((NEW_UPDATE_KEY));
            
            /***            ****            ***/

            /** Input data for the Sidetree request */
            const SIDETREE_REQUEST_INPUT: RequestInput = {
                did: input.state.did_tyronZIL,
                updatePrivateKey: input.updatePrivateKey,
                newUpdateCommitment: NEW_UPDATE_COMMITMENT,
                patches: update.patches
            };

            /** Sidetree data to generate a `DID-update` operation */
            const SIDETREE_REQUEST = await DidUpdate.sidetreeRequest(SIDETREE_REQUEST_INPUT);
            const SIDETREE_REQUEST_BUFFER = Buffer.from(JSON.stringify(SIDETREE_REQUEST));
            
            /** Executes the Sidetree UpdateOperation 
             * @returns UpdateOperation = {operationBuffer, didUniqueSuffix, signedData, signedDataModel, encodedDelta, delta} */
            const UPDATE_OPERATION = await UpdateOperation.parse(SIDETREE_REQUEST_BUFFER);
            
            //** Output data from a Sidetree-based `DID-update` operation */
            const OPERATION_OUTPUT: UpdateOperationModel = {
                did_tyronZIL: input.state.did_tyronZIL,
                newUpdateCommitment: NEW_UPDATE_COMMITMENT,
                sidetreeRequest: SIDETREE_REQUEST_BUFFER,
                updateOperation: UPDATE_OPERATION,
                privateKey: update.privateKey,
                newUpdatePrivateKey: NEW_UPDATE_PRIVATE_KEY
            };
            return new DidUpdate(OPERATION_OUTPUT);
        })
        .catch(err => console.error(err))
        return did_executed;
    }

    /***            ****            ***/

    /** Generates the Sidetree data for the `DID-update` operation */
    public static async sidetreeRequest(input: RequestInput): Promise<SignedDataRequest> {
        
        /** The Update Operation Delta Object */
        const DELTA_OBJECT = {
            patches: input.patches,
            update_commitment: input.newUpdateCommitment        //value that MUST be revealed for the next update-operation
        };
        const DELTA_BUFFER = Buffer.from(JSON.stringify(DELTA_OBJECT));
        const DELTA = Encoder.encode(DELTA_BUFFER);
        const DELTA_HASH = Encoder.encode(Multihash.hash(DELTA_BUFFER));
        
        /** For the Update Operation Signed Data Object */
        const SIGNED_DATA: UpdateSignedDataModel = {
            delta_hash: DELTA_HASH,
            update_key: Cryptography.getPublicKey(input.updatePrivateKey)
        };
        const SIGNED_DATA_JWS = await Cryptography.signUsingEs256k(SIGNED_DATA, input.updatePrivateKey);

        /** DID data to generate a Sidetree UpdateOperation */
        const SIDETREE_REQUEST: SignedDataRequest = {
            did_suffix: input.did,
            signed_data: SIGNED_DATA_JWS,
            type: OperationType.Update,
            delta: DELTA
        };
        return SIDETREE_REQUEST;
    }
}

/***            ** interfaces **            ***/

/** Defines input data for a Sidetree-based `DID-update` operation*/
export interface UpdateOperationInput {
    state: DidState;
    updatePrivateKey: JwkEs256k;
    patches: PatchModel[];
}

/** Defines output data of a Sidetree-based `DID-update` operation */
interface UpdateOperationModel {
    did_tyronZIL: string;
    newUpdateCommitment: string;
    sidetreeRequest: Buffer;
    updateOperation: UpdateOperation;
    privateKey?: string[];
    newUpdatePrivateKey: JwkEs256k;
}

/** Defines input data for a Sidetree-based `DID-update` operation REQUEST*/
interface RequestInput {
    did: string;
    updatePrivateKey: JwkEs256k;
    newUpdateCommitment: string;
    patches: PatchModel[];
}

/** Defines data for a Sidetree UpdateOperation REQUEST*/
interface SignedDataRequest {
    did_suffix: string;
    signed_data: string;
    type: OperationType.Update;
    delta: string;
}
