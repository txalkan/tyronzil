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

import TyronZILScheme from '../tyronZIL-schemes/did-scheme';
import {
    Cryptography,
    OperationKeyPairInput
 } from '../did-keys';
import { PublicKeyModel } from '../models/verification-method-models';
import JwkEs256k from '@decentralized-identity/sidetree/dist/lib/core/models/JwkEs256k';
import Jwk from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/util/Jwk';
import Jws from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/util/Jws';
import Multihash from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/Multihash';
import Encoder from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/Encoder';
import OperationType from '@decentralized-identity/sidetree/dist/lib/core/enums/OperationType';
import UpdateOperation from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/UpdateOperation';
import { PatchModel, PatchAction } from '../models/patch-model';
import DeltaModel from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/models/DeltaModel';
import { UpdateSignedDataModel } from '../models/signed-data-models';

/** Defines input data for a Sidetree-based `DID-update` operation*/
interface UpdateOperationInput {
    didTyronZIL: TyronZILScheme;
    updateKey: JwkEs256k;
    updatePrivateKey: JwkEs256k;
}

/** Defines output data of a Sidetree-based `DID-update` operation */
interface UpdateOperationOutput {
    sidetreeRequest: RequestData;
    operationBuffer: Buffer;
    updateOperation: UpdateOperation;
    publicKey: PublicKeyModel[];
    privateKey: JwkEs256k[];
    updateKey: JwkEs256k;
    updatePrivateKey: JwkEs256k;
    updateCommitment: string;
}

/** Defines input data for a Sidetree-based `DID-update` operation REQUEST*/
interface RequestInput {
    didTyronZIL: TyronZILScheme;
    updateKey: JwkEs256k;
    updatePrivateKey: JwkEs256k;
    updateCommitment: string;
    patches: PatchModel[];
}

/** Defines data for a Sidetree UpdateOperation REQUEST*/
interface RequestData {
    did_suffix: string;
    signed_data: string;
    type?: OperationType.Update;
    delta?: string;
}

/** Generates a Sidetree-based `DID-update` operation */
export default class DidUpdate{
    public readonly sidetreeRequest: RequestData;
    public readonly operationBuffer: Buffer;
    public readonly updateOperation: UpdateOperation;
    public readonly type: OperationType.Update;
    public readonly didUniqueSuffix: string;
    public readonly signedDataJws: Jws;
    public readonly signedData: UpdateSignedDataModel;
    public readonly encodedDelta: string | undefined;
    public readonly delta: DeltaModel | undefined; // undefined when Map file mode is ON
    public readonly publicKey: PublicKeyModel[];
    public readonly privateKey: JwkEs256k[];
    public readonly updateKey: JwkEs256k;
    public readonly updatePrivateKey: JwkEs256k;
    public readonly updateCommitment: string;
    
    private constructor (
        operationOutput: UpdateOperationOutput
    ) {
        this.sidetreeRequest = operationOutput.sidetreeRequest;
        this.operationBuffer = operationOutput.operationBuffer;
        this.updateOperation = operationOutput.updateOperation;
        this.type = OperationType.Update;
        this.didUniqueSuffix = operationOutput.updateOperation.didUniqueSuffix;
        this.signedDataJws = operationOutput.updateOperation.signedDataJws;
        this.signedData = {
            delta_hash: operationOutput.updateOperation.signedData.deltaHash,
            update_key: operationOutput.updateOperation.signedData.updateKey
        };
        this.encodedDelta = operationOutput.updateOperation.encodedDelta;
        this.delta = operationOutput.updateOperation.delta;
        this.publicKey = operationOutput.publicKey;
        this.privateKey = operationOutput.privateKey;
        this.updateKey = operationOutput.updateKey;
        this.updatePrivateKey = operationOutput.updatePrivateKey;
        this.updateCommitment = operationOutput.updateCommitment;
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

        /** Input data for the Sidetree request */
        const SIDETREE_REQUEST_INPUT: RequestInput = {
            didTyronZIL: input.didTyronZIL,
            updateKey: input.updateKey,
            updatePrivateKey: input.updatePrivateKey,
            updateCommitment: NEXT_UPDATE_COMMITMENT,
            patches: [PATCH]
        };

        /** Sidetree data to generate a `DID-update` operation */
        const SIDETREE_REQUEST = await DidUpdate.sidetreeRequest(SIDETREE_REQUEST_INPUT);
            const OPERATION_BUFFER = Buffer.from(JSON.stringify(SIDETREE_REQUEST));
        
        /** Executes the Sidetree update operation 
         * @returns UpdateOperation = {operationBuffer, didUniqueSuffix, signedData, signedDataModel, encodedDelta, delta} */
        const UPDATE_OPERATION = await UpdateOperation.parse(OPERATION_BUFFER);
        
        /** Output data from a Sidetree-based `DID-update` operation */
        const OPERATION_OUTPUT: UpdateOperationOutput = {
            sidetreeRequest: SIDETREE_REQUEST,
            operationBuffer: OPERATION_BUFFER,
            updateOperation: UPDATE_OPERATION,
            publicKey: [NEW_SIGNING_KEY],
            privateKey: [NEW_SIGNING_PRIVATE_KEY],
            updateKey: NEXT_UPDATE_KEY,
            updatePrivateKey: NEXT_UPDATE_PRIVATE_KEY,
            updateCommitment: NEXT_UPDATE_COMMITMENT
        };
        return new DidUpdate(OPERATION_OUTPUT);
    }

    /** Generates the Sidetree data for the `DID-update` operation */
    public static async sidetreeRequest(input: RequestInput): Promise<RequestData> {
        
        /** The Update Operation Delta Object */
        const DELTA: DeltaModel = {
            patches: input.patches,
            updateCommitment: input.updateCommitment,
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
        const SIGNED_DATA_JWS = await Cryptography.signUsingEs256k(input.didTyronZIL, SIGNED_DATA, input.updatePrivateKey);

        /** DID data to generate a Sidetree-based `DID-update` operation */
        const SIDETREE_REQUEST: RequestData = {
            did_suffix: input.didTyronZIL.didUniqueSuffix,
            signed_data: SIGNED_DATA_JWS,
            type: OperationType.Update,
            delta: ENCODED_DELTA
        };
        return SIDETREE_REQUEST;
    }
}
