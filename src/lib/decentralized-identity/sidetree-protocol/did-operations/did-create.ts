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
import CreateOperation from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/CreateOperation';
import JwkEs256k from '@decentralized-identity/sidetree/dist/lib/core/models/JwkEs256k';
import { Cryptography, OperationKeyPairInput } from '../../util/did-keys';
import { PublicKeyModel } from '../models/verification-method-models';
import { CliInputModel } from '../../../../bin/util';
import TyronZILScheme from '../../tyronZIL-schemes/did-scheme';
import { SchemeInputData } from '../../tyronZIL-schemes/did-scheme';
import Multihash from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/Multihash';
import Encoder from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/Encoder';
import ServiceEndpointModel from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/models/ServiceEndpointModel';
import { DocumentModel, PatchModel, PatchAction } from '../models/patch-model';
import { SuffixDataModel } from '../sidetree';

/** Generates a Sidetree-based `DID-create` operation */
export default class DidCreate {
    public readonly type = OperationType.Create;
    public readonly didScheme: TyronZILScheme;
    public readonly sidetreeRequest: Buffer;
    /** The result from the Sidetree request */
    public readonly createOperation: CreateOperation;
    /** The encoded Delta Object */
    public readonly delta: string;
    /** The encoded Suffix Data Object */
    public readonly suffixData: string;
    public readonly privateKey: string[];
    public readonly updatePrivateKey: JwkEs256k;
    public readonly recoveryPrivateKey: JwkEs256k;
    
    /***            ****            ***/

    private constructor (
        operation: CreateOperationModel
    ) {
        this.didScheme = operation.didScheme;
        this.sidetreeRequest = operation.sidetreeRequest;
        this.createOperation = operation.createOperation;    
        this.delta = this.createOperation.encodedDelta!;
        this.suffixData = this.createOperation.encodedSuffixData;
        this.privateKey = operation.privateKey;
        this.updatePrivateKey = operation.updatePrivateKey;
        this.recoveryPrivateKey = operation.recoveryPrivateKey;
    }

    /***            ****            ***/
   
    /** Generates a Sidetree-based `DID-create` operation with input from the CLI */
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
            PRIVATE_KEYS.push(Encoder.encode(Buffer.from(JSON.stringify(PRIVATE_KEY))));
        }
        
        // Creates key-pair for the updateCommitment (save private key for next update operation)
        const [UPDATE_KEY, UPDATE_PRIVATE_KEY] = await Cryptography.jwkPair();
        /** Utilizes the UPDATE_KEY to make the `update reveal value` for the next update operation */
        const UPDATE_COMMITMENT = Multihash.canonicalizeThenHashThenEncode(UPDATE_KEY);

        // Creates key-pair for the recoveryCommitment (save private key for next recovery operation)
        const [RECOVERY_KEY, RECOVERY_PRIVATE_KEY] = await Cryptography.jwkPair();
        /** Utilizes the RECOVERY_KEY to make the next recovery commitment hash */
        const RECOVERY_COMMITMENT = Multihash.canonicalizeThenHashThenEncode(RECOVERY_KEY);
        
        /** Input data for the Sidetree request */
        const SIDETREE_REQUEST_INPUT: RequestInput = {
            publicKey: PUBLIC_KEYS,
            service: input.service,
            updateCommitment: UPDATE_COMMITMENT,
            recoveryCommitment: RECOVERY_COMMITMENT
        };
        
        /***            ****            ***/
        
        /** Sidetree data to generate a `DID-create` operation */
        const SIDETREE_REQUEST = await DidCreate.sidetreeRequest(SIDETREE_REQUEST_INPUT);
        const SIDETREE_REQUEST_BUFFER = Buffer.from(JSON.stringify(SIDETREE_REQUEST));
        
        /** Executes the Sidetree CreateOperation */
        const CREATE_OPERATION = await CreateOperation.parse(SIDETREE_REQUEST_BUFFER);

        const SCHEME_DATA: SchemeInputData = {
            network: input.network,
            didUniqueSuffix: CREATE_OPERATION.didUniqueSuffix
        };

        /** The tyronZIL DID-scheme */
        const DID_SCHEME = await TyronZILScheme.newDID(SCHEME_DATA);

        /** Output data from a new Sidetree-based `DID-create` operation */
        const OPERATION_OUTPUT: CreateOperationModel = {
            didScheme: DID_SCHEME,
            sidetreeRequest: SIDETREE_REQUEST_BUFFER,
            createOperation: CREATE_OPERATION,
            privateKey: PRIVATE_KEYS,
            updatePrivateKey: UPDATE_PRIVATE_KEY,
            recoveryPrivateKey: RECOVERY_PRIVATE_KEY  
        };
        return new DidCreate(OPERATION_OUTPUT);
    }

    /***            ****            ***/

    /** Generates the Sidetree data for the `DID-create` operation */
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
        const DELTA_OBJECT = {
            patches: [PATCH],
            updateCommitment: input.updateCommitment
        };
        const DELTA_BUFFER = Buffer.from(JSON.stringify(DELTA_OBJECT));
        const DELTA = Encoder.encode(DELTA_BUFFER);    
        const DELTA_HASH = Encoder.encode(Multihash.hash(DELTA_BUFFER));
        
        /** The Create Operation Suffix Data Object */
        const SUFFIX_DATA_OBJECT: SuffixDataModel = {
            delta_hash: DELTA_HASH,
            recovery_commitment: input.recoveryCommitment
        };
        const SUFFIX_DATA = Encoder.encode(JSON.stringify(SUFFIX_DATA_OBJECT));

        /** DID data to generate a new Sidetree CreateOperation */
        const SIDETREE_REQUEST: CreateDataRequest = {
            suffix_data: SUFFIX_DATA,
            type: OperationType.Create,
            delta: DELTA
        };
        
        return SIDETREE_REQUEST;    
    }
}

/***            ** interfaces **            ***/

/** Defines output data for a Sidetree-based `DID-create` operation */
interface CreateOperationModel {
    didScheme: TyronZILScheme;
    sidetreeRequest: Buffer;
    createOperation: CreateOperation;
    privateKey: string[];
    updatePrivateKey: JwkEs256k;
    recoveryPrivateKey: JwkEs256k;
}

/** Defines input data for a Sidetree-based `DID-create` operation REQUEST*/
interface RequestInput {
    publicKey: PublicKeyModel[];
    service?: ServiceEndpointModel[];
    updateCommitment: string;
    recoveryCommitment: string;
}

/** Defines data for a Sidetree CreateOperation REQUEST*/
export interface CreateDataRequest {
    suffix_data: string;
    type: OperationType.Create;
    delta: string;
}
