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

import {
    Cryptography,
    OperationKeyPairInput
 } from '../did-keys';
import JwkEs256k from '@decentralized-identity/sidetree/dist/lib/core/models/JwkEs256k';
import Jwk from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/util/Jwk';
import Multihash from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/Multihash';
import Encoder from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/Encoder';

import OperationType from '@decentralized-identity/sidetree/dist/lib/core/enums/OperationType';
import UpdateOperation from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/UpdateOperation';
import PublicKeyModel from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/models/PublicKeyModel';
import { PatchModel, PatchAction } from '../models/did-patches';
import DeltaModel from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/models/DeltaModel';
import { UpdateSignedDataModel } from '../models/signed-data-model';

/** Defines input data for a Sidetree-based `DID-update` operation*/
interface UpdateOperationInput {
    didUniqueSuffix: string;
    updateKey: JwkEs256k;
    updatePrivateKey: JwkEs256k;
}

/** Defines output data of a Sidetree-based `DID-update` operation */
interface UpdateOperationOutput {
    operationRequest: RequestOutput;
    operationBuffer: Buffer;
    updateOperation: UpdateOperation;
    newSigningKeys: PublicKeyModel[];
    newSigningPrivateKeys: JwkEs256k[];
    nextUpdateKey: JwkEs256k;
    nextUpdatePrivateKey: JwkEs256k;
    nextUpdateRevealValue: string;
}

/** Defines input data for a Sidetree-based `DID-update` operation REQUEST*/
interface RequestInput {
    didUniqueSuffix: string;
    updateKey: JwkEs256k;
    updatePrivateKey: JwkEs256k;
    nextUpdateRevealValue: string;
    patches: PatchModel[];
}

/** Defines output data of a Sidetree-based `DID-update` operation REQUEST*/ //to-do change names
interface RequestOutput {
    didUniqueSuffix: string;
    type: OperationType.Update;
    signed_data: string;
    encodedDelta: string;
}

/** Generates a Sidetree-based `DID-update` operation */
export default class DidUpdate{
    public readonly operationRequest: RequestOutput;
    public readonly operationBuffer: Buffer;
    public readonly updateOperation: UpdateOperation;
    public readonly type: OperationType.Update;
    public readonly newSigningKeys: PublicKeyModel[];
    public readonly newSigningPrivateKeys: JwkEs256k[];
    public readonly nextUpdateKey: JwkEs256k;
    public readonly nextUpdatePrivateKey: JwkEs256k;
    public readonly nextUpdateRevealValue: string;
    
    private constructor (
        operationOutput: UpdateOperationOutput
    ) {
        this.operationRequest = operationOutput.operationRequest;
        this.operationBuffer = operationOutput.operationBuffer;
        this.updateOperation = operationOutput.updateOperation;
        this.type = OperationType.Update;
        this.newSigningKeys = operationOutput.newSigningKeys;
        this.newSigningPrivateKeys = operationOutput.newSigningPrivateKeys;
        this.nextUpdateKey = operationOutput.nextUpdateKey;
        this.nextUpdatePrivateKey = operationOutput.nextUpdatePrivateKey;
        this.nextUpdateRevealValue = operationOutput.nextUpdateRevealValue;
    }

    /** Generates a Sidetree-based `DID-update` operation that adds a new key pair for the DID */
    public static async addPublicKeys(input: UpdateOperationInput): Promise<DidUpdate> {
        
        /** To create a new main DID key-pair to update the DID document */
        const NEW_SIGNING_KEY_INPUT: OperationKeyPairInput = {
            id: 'newSigningKey'
        };
        // Creates a new DID main key-pair:
        const [NEW_SIGNING_KEY, NEW_SIGNING_PRIVATE_KEY] = await Cryptography.operationKeyPair(NEW_SIGNING_KEY_INPUT);
        
        const PATCH: PatchModel = {
            action: PatchAction.AddKeys,
            publicKeys: [NEW_SIGNING_KEY],
        };
 
        // Creates an update key-pair for the next updateCommitment:
        const [NEXT_UPDATE_KEY, NEXT_UPDATE_PRIVATE_KEY] = await Jwk.generateEs256kKeyPair();
        
        /** Utilizes the NEXT_UPDATE_KEY to make a new `update reveal value` for the next update operation */
        const NEXT_UPDATE_COMMITMENT = Multihash.canonicalizeThenHashThenEncode(NEXT_UPDATE_KEY);

        /** Input data for the update operation-request */
        const OPERATION_REQUEST_INPUT: RequestInput = {
            didUniqueSuffix: input.didUniqueSuffix,
            updateKey: input.updateKey,
            updatePrivateKey: input.updatePrivateKey,
            nextUpdateRevealValue: NEXT_UPDATE_COMMITMENT,
            patches: [PATCH]
        };

        /** DID data to generate a Sidetree-based `DID-update` operation */
        const OPERATION_REQUEST = await DidUpdate.operationRequest(OPERATION_REQUEST_INPUT);
            const OPERATION_BUFFER = Buffer.from(JSON.stringify(OPERATION_REQUEST));
        
        /** Executes the Sidetree update operation 
         * @returns UpdateOperation = {operationBuffer, didUniqueSuffix, signedData, signedDataModel, encodedDelta, delta} */
        const UPDATE_OPERATION = await UpdateOperation.parse(OPERATION_BUFFER);
        
        /** Output data from a Sidetree-based `DID-update` operation */
        const OPERATION_OUTPUT: UpdateOperationOutput = {
            operationRequest: OPERATION_REQUEST,
            operationBuffer: OPERATION_BUFFER,
            updateOperation: UPDATE_OPERATION,
            newSigningKeys: [NEW_SIGNING_KEY],
            newSigningPrivateKeys: [NEW_SIGNING_PRIVATE_KEY],
            nextUpdateKey: NEXT_UPDATE_KEY,
            nextUpdatePrivateKey: NEXT_UPDATE_PRIVATE_KEY,
            nextUpdateRevealValue: NEXT_UPDATE_COMMITMENT
        };
        return new DidUpdate(OPERATION_OUTPUT);
    }

    /** Generates a Sidetree-based `DID-update` operation REQUEST  */
    public static async operationRequest(input: RequestInput): Promise<RequestOutput> {
        
        /** The Update Operation Delta Object */
        const DELTA: DeltaModel = {
            patches: input.patches,
            updateCommitment: input.nextUpdateRevealValue,
            // The value that MUST be revealed for the next update-operation
        };
        const DELTA_BUFFER = Buffer.from(JSON.stringify(DELTA));
            const ENCODED_DELTA = Encoder.encode(DELTA_BUFFER);
            const DELTA_HASH = Encoder.encode(Multihash.hash(DELTA_BUFFER));
            
        /** To create the Update Operation Signed Data Object */
        const SIGNED_DATA: UpdateSignedDataModel = {
            delta_hash: DELTA_HASH,
            update_key: input.updateKey
        };
        const SIGNED_DATA_JWS = await Cryptography.signUsingEs256k(SIGNED_DATA, input.updatePrivateKey);
        
        /** The Update Operation Signed Data Object to-do */
        
        /** DID data to generate a Sidetree-based `DID-update` operation */
        const OPERATION_REQUEST: RequestOutput = {
            didUniqueSuffix: input.didUniqueSuffix,
            type: OperationType.Update,
            signed_data: SIGNED_DATA_JWS,
            encodedDelta: ENCODED_DELTA
        };
        return OPERATION_REQUEST;
    }
}
