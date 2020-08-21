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
import { Cryptography, OperationKeyPairInput, JwkEs256k } from '../did-keys';
import { PublicKeyModel } from '../models/verification-method-models';
import Jws from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/util/Jws';
import Multihash from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/Multihash';
import Encoder from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/Encoder';
import OperationType from '@decentralized-identity/sidetree/dist/lib/core/enums/OperationType';
import UpdateOperation from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/UpdateOperation';
import { PatchModel, PatchAction } from '../models/patch-model';
import DeltaModel from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/models/DeltaModel';
import { UpdateSignedDataModel } from '../models/signed-data-models';
import SidetreeError from '@decentralized-identity/sidetree/dist/lib/common/SidetreeError';
import ErrorCode from '../../ErrorCode';
import { PublicKeyInput } from '../models/cli-input-model';
import DidState from '../did-state';

/** Generates a Sidetree-based `DID-update` operation */
export default class DidUpdate{
    public readonly did_tyronZIL: TyronZILScheme;
    public readonly sidetreeRequest: SignedDataRequest;
    public readonly operationBuffer: Buffer;
    public readonly updateOperation: UpdateOperation;
    public readonly type: OperationType.Update;
    public readonly didUniqueSuffix: string;
    public readonly signedDataJws: Jws;
    public readonly signedData: UpdateSignedDataModel;
    public readonly encodedDelta: string | undefined;
    public readonly delta: DeltaModel | undefined; // undefined when Map file mode is ON
    public readonly didState: DidState;
    public readonly privateKey?: string[];
    public readonly updateKey: JwkEs256k;
    public readonly updatePrivateKey: JwkEs256k;
    public readonly updateCommitment: string;
    
    private constructor (
        operationOutput: UpdateOperationOutput
    ) {
        this.did_tyronZIL = operationOutput.did_tyronZIL;
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
        this.didState = operationOutput.didState;
        this.privateKey = operationOutput.privateKey;
        this.updateKey = operationOutput.updateKey;
        this.updatePrivateKey = operationOutput.updatePrivateKey;
        this.updateCommitment = operationOutput.updateCommitment;
    }

    /***            ****            ***/
    
    /** Generates a Sidetree-based `DID-update` operation with input from the CLI */
    public static async execute(input: UpdateOperationInput): Promise<DidUpdate> {
        /** The tyronZIL DID-state that updates */
        const DID_STATE = input.didState;
        DID_STATE.status = OperationType.Update;

        const PUBLIC_KEYS = DID_STATE.publicKey;

        /** Maps the public keys to their IDs */
        const KEY_MAP = new Map((DID_STATE.publicKey || []).map(publicKey => [publicKey.id, publicKey]));

        /** The requested update patch by the user*/
        const ACTION = input.patch.action;
        const PATCHES = [];
        let PRIVATE_KEYS;
        const PUBLIC_KEY = [];
        switch (ACTION) {
            case PatchAction.AddKeys: {
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
                        DID_STATE.service?.push(service)
                    }
                }
            }
                break;
            case PatchAction.RemoveServices:
                if (DID_STATE.service !== undefined && input.patch.ids !== undefined) {
                    PATCHES.push({
                        action: PatchAction.RemoveServices,
                        ids: input.patch.ids
                    })
                    
                    /** IDs of the services to remove */
                    const IDs = new Set(input.patch.ids);

                    DID_STATE.service = DID_STATE.service.filter(service => !IDs.has(service.id))
                }
                break;
            case PatchAction.RemoveKeys:
                if (input.patch.public_keys !== undefined && DID_STATE.publicKey !== undefined) {
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
                    DID_STATE.publicKey = PUBLIC_KEY;
                }
                break;
            default:
                throw new SidetreeError(ErrorCode.IncorrectPatchAction);
        }
        
        
        /***            ****            ***/

        // Creates key-pair for the updateCommitment (save private key for next update operation)
        const [UPDATE_KEY, UPDATE_PRIVATE_KEY] = await Cryptography.jwkPair();
        /** Utilizes the UPDATE_KEY to make the `update reveal value` for the next update operation */
        const NEW_UPDATE_COMMITMENT = Multihash.canonicalizeThenHashThenEncode(Cryptography.removeKid(UPDATE_KEY));
        DID_STATE.updateCommitment = NEW_UPDATE_COMMITMENT;
        
        /***            ****            ***/

        const PREVIOUS_UPDATE_KEY = Cryptography.getPublicKeyNoKid(input.updatePrivateKey)
        const updateNoKid = Cryptography.removeKid(input.updatePrivateKey);

        /** Input data for the Sidetree request */
        const SIDETREE_REQUEST_INPUT: RequestInput = {
            did_tyronZIL: input.did_tyronZIL,
            updateKey: PREVIOUS_UPDATE_KEY ,
            updatePrivateKey: updateNoKid,
            updateCommitment: NEW_UPDATE_COMMITMENT,
            patches: PATCHES
        };

        /** Sidetree data to generate a `DID-update` operation */
        const SIDETREE_REQUEST = await DidUpdate.sidetreeRequest(SIDETREE_REQUEST_INPUT);
            const OPERATION_BUFFER = Buffer.from(JSON.stringify(SIDETREE_REQUEST));
        
        /** Executes the Sidetree UpdateOperation 
         * @returns UpdateOperation = {operationBuffer, didUniqueSuffix, signedData, signedDataModel, encodedDelta, delta} */
        const UPDATE_OPERATION = await UpdateOperation.parse(OPERATION_BUFFER);
        
        /** Output data from a Sidetree-based `DID-update` operation */
        const OPERATION_OUTPUT: UpdateOperationOutput = {
            did_tyronZIL: input.did_tyronZIL,
            sidetreeRequest: SIDETREE_REQUEST,
            operationBuffer: OPERATION_BUFFER,
            updateOperation: UPDATE_OPERATION,
            didState: DID_STATE,
            privateKey: PRIVATE_KEYS,
            updateKey: UPDATE_KEY,
            updatePrivateKey: UPDATE_PRIVATE_KEY,
            updateCommitment: NEW_UPDATE_COMMITMENT,
        };
        return new DidUpdate(OPERATION_OUTPUT);
    }

    /***            ****            ***/

    /** Generates the Sidetree data for the `DID-update` operation */
    public static async sidetreeRequest(input: RequestInput): Promise<SignedDataRequest> {
        
        /** The Update Operation Delta Object */
        const DELTA = {
            patches: input.patches,
            update_commitment: input.updateCommitment    // value that MUST be revealed for the next update-operation
        };
        const DELTA_BUFFER = Buffer.from(JSON.stringify(DELTA));
            const ENCODED_DELTA = Encoder.encode (DELTA_BUFFER);
            const DELTA_HASH = Encoder.encode(Multihash.hash(DELTA_BUFFER));
            
        /** For the Update Operation Signed Data Object */
        const SIGNED_DATA: UpdateSignedDataModel = {
            delta_hash: DELTA_HASH,
            update_key: input.updateKey
        };
        const SIGNED_DATA_JWS = await Cryptography.signUsingEs256k(SIGNED_DATA, input.updatePrivateKey);

        /** DID data to generate a Sidetree UpdateOperation */
        const SIDETREE_REQUEST: SignedDataRequest = {
            did_suffix: input.did_tyronZIL.didUniqueSuffix,
            signed_data: SIGNED_DATA_JWS,
            type: OperationType.Update,
            delta: ENCODED_DELTA
        };
        // Printing the operation request for testing purposes
        console.log(`The update request is: ${JSON.stringify(SIDETREE_REQUEST,null,2)}`);
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
    did_tyronZIL: TyronZILScheme;
    updatePrivateKey: JwkEs256k;
    patch: PatchModel;
    didState: DidState;
}

/** Defines output data of a Sidetree-based `DID-update` operation */
interface UpdateOperationOutput {
    did_tyronZIL: TyronZILScheme;
    sidetreeRequest: SignedDataRequest;
    operationBuffer: Buffer;
    updateOperation: UpdateOperation;
    didState: DidState;
    privateKey?: string[];
    updateKey: JwkEs256k;
    updatePrivateKey: JwkEs256k;
    updateCommitment: string;
}

/** Defines input data for a Sidetree-based `DID-update` operation REQUEST*/
interface RequestInput {
    did_tyronZIL: TyronZILScheme;
    updateKey: JwkEs256k;
    updatePrivateKey: JwkEs256k;
    updateCommitment: string;
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