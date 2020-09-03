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
import { Cryptography, OperationKeyPairInput } from '../util/did-keys';
import { PublicKeyModel } from '../util/sidetree protocol/models/verification-method-models';
import Multihash from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/Multihash';
import Encoder from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/Encoder';
import OperationType from '@decentralized-identity/sidetree/dist/lib/core/enums/OperationType';
import UpdateOperation from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/UpdateOperation';
import { PatchModel, PatchAction } from '../util/sidetree protocol/models/patch-model';
import { UpdateSignedDataModel } from '../util/sidetree protocol/models/signed-data-models';
import SidetreeError from '@decentralized-identity/sidetree/dist/lib/common/SidetreeError';
import ErrorCode from '../util/ErrorCode';
import { PublicKeyInput } from '../../../bin/cli-input-model';
import DidState from '../did-state';

/** Generates a Sidetree-based `DID-update` operation */
export default class DidUpdate{
    public readonly type: OperationType.Update;
    public readonly did: string;
    public readonly sidetreeRequest: Buffer;
    /** The result from the Sidetree request */
    public readonly updateOperation: UpdateOperation;
    /** The encoded Delta Object */
    public readonly delta: string;
    /** The signature from the previous Signed Data Object */
    public readonly updateSignature: string;
    public readonly privateKey?: string[];
    public readonly updatePrivateKey: JwkEs256k;
    
    private constructor (
        operation: UpdateOperationModel
    ) {
        this.type = OperationType.Update;
        this.did = operation.did;
        this.sidetreeRequest = operation.sidetreeRequest;
        this.updateOperation = operation.updateOperation;
        this.delta = this.updateOperation.encodedDelta!;
        this.updateSignature = this.updateOperation.signedDataJws.signature;
        this.privateKey = operation.privateKey;
        this.updatePrivateKey = operation.newUpdatePrivateKey;
    }

    /***            ****            ***/
    
    /** Generates a Sidetree-based `DID-update` operation with input from the CLI */
    public static async execute(input: UpdateOperationInput): Promise<DidUpdate> {
        const PUBLIC_KEYS = input.state.publicKey;

        /** Maps the public keys to their IDs */
        const KEY_MAP = new Map((PUBLIC_KEYS || []).map(publicKey => [publicKey.id, publicKey]));

        /** The requested update patch by the user */
        const ACTION = input.patch.action;
        const PATCHES = [];
        let PRIVATE_KEYS;
        const PUBLIC_KEY = [];
        switch (ACTION) {
            case PatchAction.AddKeys:
                {
                    const KEYS = input.patch.keyInput;
                    if ( KEYS !== undefined) {
                        const ADD_KEYS = await DidUpdate.addKeys(KEYS);
                        PATCHES.push(ADD_KEYS.patch);
                        PRIVATE_KEYS = ADD_KEYS.privateKey
                        
                        if (Array.isArray(ADD_KEYS.publicKey)) {
                            for (const key of ADD_KEYS.publicKey) {
                                PUBLIC_KEYS?.push(key)
                            }
                        }
                    }
                }
                break;
            case PatchAction.AddServices:
                {
                    const SERVICES = input.patch.service_endpoints;
                    if (SERVICES !== undefined) {
                        PATCHES.push({
                            action: PatchAction.AddServices,
                            service_endpoints: input.patch.service_endpoints
                        })
                        for (const service of SERVICES) {
                            input.state.service?.push(service)
                        }
                    }
                }
                break;
            case PatchAction.RemoveServices:
                if (input.state.service !== undefined && input.patch.ids !== undefined) {
                    PATCHES.push({
                        action: PatchAction.RemoveServices,
                        ids: input.patch.ids
                    })
                }
                break;
            case PatchAction.RemoveKeys:
                if (input.patch.public_keys !== undefined) {
                    PATCHES.push({
                        action: PatchAction.RemoveKeys,
                        public_keys: input.patch.public_keys
                    });
                    const ID = input.patch.public_keys;
                    for (const id of ID) {
                        if (typeof id === 'string') {
                            const KEY = KEY_MAP.get(id);
                            if (KEY !== undefined) {
                                KEY_MAP.delete(id)
                            }
                        }
                    }
                    for (const value of KEY_MAP.values()){
                        PUBLIC_KEY.push(value)
                    }
                }
                break;
            default:
                throw new SidetreeError(ErrorCode.IncorrectPatchAction);
        }

        /***            ****            ***/

        // Creates key-pair for the updateCommitment (save private key for next update operation)
        const [UPDATE_KEY, UPDATE_PRIVATE_KEY] = await Cryptography.jwkPair();
        /** Utilizes the UPDATE_KEY to make the `update reveal value` for the next update operation */
        const NEW_UPDATE_COMMITMENT = Multihash.canonicalizeThenHashThenEncode((UPDATE_KEY));
        
        /***            ****            ***/

        /** Input data for the Sidetree request */
        const SIDETREE_REQUEST_INPUT: RequestInput = {
            did: input.state.did_tyronZIL,
            updatePrivateKey: input.updatePrivateKey,
            newUpdateCommitment: NEW_UPDATE_COMMITMENT,
            patches: PATCHES
        };

        /** Sidetree data to generate a `DID-update` operation */
        const SIDETREE_REQUEST = await DidUpdate.sidetreeRequest(SIDETREE_REQUEST_INPUT);
        const SIDETREE_REQUEST_BUFFER = Buffer.from(JSON.stringify(SIDETREE_REQUEST));
        
        /** Executes the Sidetree UpdateOperation 
         * @returns UpdateOperation = {operationBuffer, didUniqueSuffix, signedData, signedDataModel, encodedDelta, delta} */
        const UPDATE_OPERATION = await UpdateOperation.parse(SIDETREE_REQUEST_BUFFER);
        
        /** Output data from a Sidetree-based `DID-update` operation */
        const OPERATION_OUTPUT: UpdateOperationModel = {
            did: input.state.did_tyronZIL,
            sidetreeRequest: SIDETREE_REQUEST_BUFFER,
            updateOperation: UPDATE_OPERATION,
            privateKey: PRIVATE_KEYS,
            newUpdatePrivateKey: UPDATE_PRIVATE_KEY
        };
        return new DidUpdate(OPERATION_OUTPUT);
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
        
        const PREVIOUS_UPDATE_KEY = Cryptography.getPublicKey(input.updatePrivateKey);
        
        /** For the Update Operation Signed Data Object */
        const SIGNED_DATA: UpdateSignedDataModel = {
            delta_hash: DELTA_HASH,
            update_key: PREVIOUS_UPDATE_KEY
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

    private static async addKeys(input: PublicKeyInput[]): Promise<NewKeys> {
        const PUBLIC_KEYS = [];
        const PRIVATE_KEYS = [];

        const PRIMARY_KEY_INPUT = input[0];

        /** To create the DID primary public key */
        const KEY_PAIR_INPUT: OperationKeyPairInput = {
            id: PRIMARY_KEY_INPUT.id,
            purpose: PRIMARY_KEY_INPUT.purpose
        }
        // Creates DID primary key-pair:
        const [PRIMARY_KEY, PRIMARY_PRIVATE_KEY] = await Cryptography.operationKeyPair(KEY_PAIR_INPUT);
        PUBLIC_KEYS.push(PRIMARY_KEY);
        PRIVATE_KEYS.push(Encoder.encode(Buffer.from(JSON.stringify(PRIMARY_PRIVATE_KEY))));

        if (input.length === 2) {
            const SECONDARY_KEY_INPUT = input[1];
            
            /** To create the DID secondary public key */
            const KEY_PAIR_INPUT: OperationKeyPairInput = {
                id: SECONDARY_KEY_INPUT.id,
                purpose: SECONDARY_KEY_INPUT.purpose
            }
            // Creates DID secondary key-pair:
            const [SECONDARY_KEY, SECONDARY_PRIVATE_KEY] = await Cryptography.operationKeyPair(KEY_PAIR_INPUT);
            PUBLIC_KEYS.push(SECONDARY_KEY);
            PRIVATE_KEYS.push(Encoder.encode(Buffer.from(JSON.stringify(SECONDARY_PRIVATE_KEY))));
        }
        const PATCH: PatchModel = {
            action: PatchAction.AddKeys,
            public_keys: PUBLIC_KEYS
        };
        const NEW_KEYS: NewKeys = {
            patch: PATCH,
            publicKey: PUBLIC_KEYS,
            privateKey: PRIVATE_KEYS
        }
        return NEW_KEYS;
        }
}

/***            ** interfaces **            ***/

/** Defines input data for a Sidetree-based `DID-update` operation*/
export interface UpdateOperationInput {
    state: DidState;
    updatePrivateKey: JwkEs256k;
    patch: PatchModel;
}

/** Defines output data of a Sidetree-based `DID-update` operation */
interface UpdateOperationModel {
    did: string;
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

interface NewKeys {
    patch: PatchModel;
    publicKey: PublicKeyModel[];
    privateKey: string[];
}
