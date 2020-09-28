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

import OperationType from '@decentralized-identity/sidetree/dist/lib/core/enums/OperationType';
import { Cryptography, OperationKeyPairInput } from '../../util/did-keys';
import { PublicKeyModel } from '../models/verification-method-models';
import { CliInputModel } from '../../../../bin/util';
import Multihash from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/Multihash';
import Encoder from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/Encoder';
import ServiceEndpointModel from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/models/ServiceEndpointModel';
import { DocumentModel, PatchModel, PatchAction } from '../models/patch-model';
import { DeltaModel, SuffixDataModel } from '../sidetree';

/** Generates a Sidetree-Tyron `DID-Create` operation */
export default class DidCreate {
    public readonly type = OperationType.Create;
    public readonly createRequest: CreateDataRequest;
    public readonly privateKey: string[];
    public readonly updatePrivateKey: string;
    public readonly recoveryPrivateKey: string;
    
    /***            ****            ***/

    private constructor (
        operation: CreateOperationModel
    ) {
        this.createRequest = operation.createRequest;
        this.privateKey = operation.privateKey;
        this.updatePrivateKey = operation.updatePrivateKey;
        this.recoveryPrivateKey = operation.recoveryPrivateKey;
    }

    /***            ****            ***/
   
    /** Generates a Sidetree-based `DID-Create` operation with input from the CLI */
    public static async execute(input: CliInputModel): Promise<DidCreate> {
        const PUBLIC_KEYS = [];
        const PRIVATE_KEYS = [];

        const PUBLIC_KEY_INPUT = input.publicKeyInput;
        for(const key_input of PUBLIC_KEY_INPUT) {
            // Creates the cryptographic key pair
            const KEY_PAIR_INPUT: OperationKeyPairInput = {
                id: key_input.id,
                purpose: key_input.purpose
            }
            const [PUBLIC_KEY, PRIVATE_KEY] = await Cryptography.operationKeyPair(KEY_PAIR_INPUT);
            PUBLIC_KEYS.push(PUBLIC_KEY);
            PRIVATE_KEYS.push(PRIVATE_KEY);
        }
        
        // Creates the update key-pair (necessary for the next update operation)
        const [UPDATE_KEY, UPDATE_PRIVATE_KEY] = await Cryptography.keyPair();
        
        // Creates the recovery key-pair (necessary for next recovery or deactivate operation)
        const [RECOVERY_KEY, RECOVERY_PRIVATE_KEY] = await Cryptography.keyPair();
        
        /** Input data for the Sidetree request */
        const CREATE_REQUEST_INPUT: RequestInput = {
            publicKey: PUBLIC_KEYS,
            service: input.service,
            updateKey: UPDATE_KEY,
            recoveryKey: RECOVERY_KEY
        };
        
        /***            ****            ***/
        
        /** Sidetree data to generate a `DID-Create` operation */
        const CREATE_REQUEST = await DidCreate.sidetreeRequest(CREATE_REQUEST_INPUT);
        
        /** Output data from a Sidetree-Tyron `DID-Create` operation */
        const OPERATION_OUTPUT: CreateOperationModel = {
            createRequest: CREATE_REQUEST,
            privateKey: PRIVATE_KEYS,
            updatePrivateKey: UPDATE_PRIVATE_KEY,
            recoveryPrivateKey: RECOVERY_PRIVATE_KEY  
        };
        return new DidCreate(OPERATION_OUTPUT);
    }

    /***            ****            ***/

    /** Generates the Sidetree data for the `DID-Create` operation */
    public static async sidetreeRequest(input: RequestInput): Promise<CreateDataRequest> {
        const DOCUMENT: DocumentModel = {
            public_keys: input.publicKey,
            service_endpoints: input.service
        };
        const PATCH: PatchModel = {
            action: PatchAction.Replace,
            document: DOCUMENT
        };
        
        /** The Create Operation Delta Object */
        const DELTA_OBJECT: DeltaModel = {
            patches: [PATCH],
            update_key: input.updateKey
        };
        const DELTA_BUFFER = Buffer.from(JSON.stringify(DELTA_OBJECT));
        const DELTA = Encoder.encode(DELTA_BUFFER);    
        const DELTA_HASH = Encoder.encode(Multihash.hash(DELTA_BUFFER));
        
        /** The Create Operation Suffix Data Object */
        const SUFFIX_DATA_OBJECT: SuffixDataModel = {
            delta_hash: DELTA_HASH,
            recovery_key: input.recoveryKey
        };
        const SUFFIX_DATA = Encoder.encode(JSON.stringify(SUFFIX_DATA_OBJECT));

        /** DID data to generate a new Sidetree CreateOperation */
        const CREATE_REQUEST: CreateDataRequest = {
            type: OperationType.Create,
            suffix_data: SUFFIX_DATA,
            delta: DELTA
        };
        
        return CREATE_REQUEST;    
    }
}

/***            ** interfaces **            ***/

/** Defines output data for a Sidetree-based `DID-Create` operation */
interface CreateOperationModel {
    createRequest: CreateDataRequest;
    privateKey: string[];
    updatePrivateKey: string;
    recoveryPrivateKey: string;
}

/** Defines input data for a Sidetree-based `DID-Create` operation REQUEST*/
interface RequestInput {
    publicKey: PublicKeyModel[];
    service?: ServiceEndpointModel[];
    updateKey: string;
    recoveryKey: string;
}

/** Defines data for a Sidetree CreateOperation REQUEST*/
export interface CreateDataRequest {
    type: OperationType.Create;
    suffix_data: string;
    delta: string;
}
