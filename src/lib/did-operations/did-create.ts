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

import {
    Cryptography,
    OperationKeyPairInput
 } from '../did-keys';
import PublicKeyModel from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/models/PublicKeyModel';
import PublicKeyPurpose from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/PublicKeyPurpose';

import JwkEs256k from '@decentralized-identity/sidetree/dist/lib/core/models/JwkEs256k';
import Jwk from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/util/Jwk';
import Multihash from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/Multihash';
import Encoder from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/Encoder';

import ServiceEndpointModel from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/models/ServiceEndpointModel';
import serviceEndpoints from '../service-endpoints';

import DocumentModel from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/models/DocumentModel';
import { PatchModel, PatchAction } from '../models/patch-model';
import DeltaModel from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/models/DeltaModel';
import SuffixDataModel from '../models/suffix-data-model';
import AnchoredOperationModel from '@decentralized-identity/sidetree/dist/lib/core/models/AnchoredOperationModel';

/** Defines output data for a Sidetree-based `DID-create` operation */
interface CreateOperationOutput {
    sidetreeRequest: RequestData;
    operationBuffer: Buffer;
    createOperation: CreateOperation;
    signingKeys: PublicKeyModel[];
    signingPrivateKeys: JwkEs256k[];
    updateKey: JwkEs256k;
    updatePrivateKey: JwkEs256k;
    updateRevealValue: string;
    recoveryKey: JwkEs256k;
    recoveryPrivateKey: JwkEs256k;
    recoveryCommitment: string;
    serviceEndpoints: ServiceEndpointModel[];
}

/** Defines input data for a Sidetree-based `DID-create` operation REQUEST*/
interface RequestInput {
    signingKeys: PublicKeyModel[];
    serviceEndpoints?: ServiceEndpointModel[];
    updateCommitment: string;
    recoveryCommitment: string;
}

/** Defines data for a Sidetree CreateOperation REQUEST*/
interface RequestData {
    suffix_data: string;
    type?: OperationType.Create;
    delta?: string;
}

/** Defines input data to anchor a Sidetree-based `DID-create` operation */
interface AnchoredCreateInput {
    transactionNumber: number;
    ledgerTime: number;
    operationIndex: number;
}

/** Defines output data of an anchored `DID-create` operation */
interface AnchoredCreateOutput {
    sidetreeRequest: RequestData;
    operationBuffer: Buffer;
    createOperation: CreateOperation;
    anchoredOperationModel: AnchoredOperationModel;
    recoveryKey: JwkEs256k;
    recoveryPrivateKey: JwkEs256k;
    updateKey: JwkEs256k;
    updatePrivateKey: JwkEs256k;
    signingKeys: PublicKeyModel[];
    signingPrivateKeys: JwkEs256k[];
    updateRevealValue: string;
}

export interface VerificationMethodInput {
    id: string;
    purpose: PublicKeyPurpose[];
}

/** Generates a Sidetree-based `DID-create` operation */
export default class DidCreate {
    public readonly sidetreeRequest: RequestData;
    public readonly operationBuffer: Buffer;
    public readonly createOperation: CreateOperation;
    public readonly type: OperationType.Create;
    public readonly didUniqueSuffix: string;
    public readonly encodedSuffixData: string;
    public readonly suffixData: SuffixDataModel;
    public readonly encodedDelta: string | undefined;
    public readonly delta: DeltaModel | undefined; // undefined when Anchor file mode is ON
    public readonly signingKeys: PublicKeyModel[];
    public readonly signingPrivateKeys: JwkEs256k[];
    public readonly updateKey: JwkEs256k;
    public readonly updatePrivateKey: JwkEs256k;
    public readonly updateRevealValue: string;
    public readonly recoveryKey: JwkEs256k;
    public readonly recoveryPrivateKey: JwkEs256k;
    public readonly recoveryCommitment: string;
    public readonly serviceEndpoints: ServiceEndpointModel[];

    private constructor (
        operationOutput: CreateOperationOutput
    ) {
        this.sidetreeRequest = operationOutput.sidetreeRequest;
        this.operationBuffer = operationOutput.operationBuffer;
        this.createOperation = operationOutput.createOperation;
        this.didUniqueSuffix = operationOutput.createOperation.didUniqueSuffix;
        this.type = OperationType.Create;
        this.encodedSuffixData = operationOutput.createOperation.encodedSuffixData;
        this.suffixData = {
            delta_hash: operationOutput.createOperation.suffixData.deltaHash,
            recovery_commitment: operationOutput.createOperation.suffixData.recoveryCommitment
        };
        this.encodedDelta = operationOutput.createOperation.encodedDelta;
        this.delta = operationOutput.createOperation.delta;
        this.signingKeys = operationOutput.signingKeys;
        this.signingPrivateKeys = operationOutput.signingPrivateKeys;
        this.updateKey = operationOutput.updateKey;
        this.updatePrivateKey = operationOutput.updatePrivateKey;
        this.updateRevealValue = operationOutput.updateRevealValue;
        this.recoveryKey = operationOutput.recoveryKey;
        this.recoveryPrivateKey = operationOutput.recoveryPrivateKey;
        this.recoveryCommitment = operationOutput.recoveryCommitment;
        this.serviceEndpoints = operationOutput.serviceEndpoints;
    }

    /** Generates a Sidetree-based `DID-create` operation without input */
    public static async execute(): Promise<DidCreate> {
        
        /** To create the DID primary public key */
        const PRIMARY_KEY_INPUT: OperationKeyPairInput = {
            id: 'primarySigningKey',
        };
        // Creates DID primary key-pair:
        const [PRIMARY_KEY, PRIMARY_PRIVATE_KEY] = await Cryptography.operationKeyPair(PRIMARY_KEY_INPUT);
        
        // Creates key-pair for the updateCommitment (save private key for next update operation)
        const [UPDATE_KEY, UPDATE_PRIVATE_KEY] = await Jwk.generateEs256kKeyPair();
        /** Utilizes the UPDATE_KEY to make the `update reveal value` for the next update operation */
        const UPDATE_COMMITMENT = Multihash.canonicalizeThenHashThenEncode(UPDATE_KEY);

        // Creates key-pair for the recoveryCommitment (save private key for next recovery operation)
        const [RECOVERY_KEY, RECOVERY_PRIVATE_KEY] = await Jwk.generateEs256kKeyPair();
        /** Utilizes the RECOVERY_KEY to make the next recovery commitment hash */
        const RECOVERY_COMMITMENT = Multihash.canonicalizeThenHashThenEncode(RECOVERY_KEY);
        
        // create service endpoints:
        const SERVICE1: ServiceEndpointModel = {
            id: '1',
            type: 'service#1',
            endpoint: 'https://url.com'
        }
        const SERVICE2: ServiceEndpointModel = {
            id: '2',
            type: 'service#2',
            endpoint: 'https://url.com'
        }
        const SERVICE_ENDPOINTS = await serviceEndpoints.new([SERVICE1, SERVICE2]);

        /** Input data for the Sidetree request */
        const SIDETREE_REQUEST_INPUT: RequestInput = {
            signingKeys: [PRIMARY_KEY],
            serviceEndpoints: SERVICE_ENDPOINTS,
            updateCommitment: UPDATE_COMMITMENT,
            recoveryCommitment: RECOVERY_COMMITMENT
        };
        
        /** Sidetree data to generate a `DID-create` operation */
        const SIDETREE_REQUEST = await DidCreate.sidetreeRequest(SIDETREE_REQUEST_INPUT);
            const OPERATION_BUFFER = Buffer.from(JSON.stringify(SIDETREE_REQUEST));
        
        /** Executes the Sidetree create operation */
        const CREATE_OPERATION = await CreateOperation.parse(OPERATION_BUFFER);
        
        /** Output data from a new Sidetree-based `DID-create` operation */
        const OPERATION_OUTPUT: CreateOperationOutput = {
            sidetreeRequest: SIDETREE_REQUEST,
            operationBuffer: OPERATION_BUFFER,
            createOperation: CREATE_OPERATION,
            signingKeys: [PRIMARY_KEY],
            signingPrivateKeys: [PRIMARY_PRIVATE_KEY],
            updateKey: UPDATE_KEY,
            updatePrivateKey: UPDATE_PRIVATE_KEY,
            updateRevealValue: UPDATE_COMMITMENT,
            recoveryKey: RECOVERY_KEY,
            recoveryPrivateKey: RECOVERY_PRIVATE_KEY,
            recoveryCommitment: RECOVERY_COMMITMENT,
            serviceEndpoints: SERVICE_ENDPOINTS       
        };
        return new DidCreate(OPERATION_OUTPUT);

    }
    
    /** Generates a Sidetree-based `DID-create` operation with input from the CLI */
    public static async executeCli(input: VerificationMethodInput[]): Promise<DidCreate> {
        
        const SIGNING_KEYS = [];
        const PRIVATE_SIGNING_KEYS = [];
        
        const PRIMARY_METHOD_INPUT = input[0];

        /** To create the DID primary public key */
        const PRIMARY_KEY_INPUT: OperationKeyPairInput = {
            id: PRIMARY_METHOD_INPUT.id,
            purpose: PRIMARY_METHOD_INPUT.purpose
        }
        // Creates DID primary key-pair:
        const [PRIMARY_KEY, PRIMARY_PRIVATE_KEY] = await Cryptography.operationKeyPair(PRIMARY_KEY_INPUT);
        SIGNING_KEYS.push(PRIMARY_KEY);
        PRIVATE_SIGNING_KEYS.push(PRIMARY_PRIVATE_KEY);

        if (input.length === 2) {
            const SECONDARY_METHOD_INPUT = input[1];
            
            /** To create the DID secondary public key */
            const SECONDARY_KEY_INPUT: OperationKeyPairInput = {
                id: SECONDARY_METHOD_INPUT.id,
                purpose: SECONDARY_METHOD_INPUT.purpose
            }
            // Creates DID secondary key-pair:
            const [SECONDARY_KEY, SECONDARY_PRIVATE_KEY] = await Cryptography.operationKeyPair(SECONDARY_KEY_INPUT);
            SIGNING_KEYS.push(SECONDARY_KEY);
            PRIVATE_SIGNING_KEYS.push(SECONDARY_PRIVATE_KEY);
        }

        // Creates key-pair for the updateCommitment (save private key for next update operation)
        const [UPDATE_KEY, UPDATE_PRIVATE_KEY] = await Jwk.generateEs256kKeyPair();
        /** Utilizes the UPDATE_KEY to make the `update reveal value` for the next update operation */
        const UPDATE_COMMITMENT = Multihash.canonicalizeThenHashThenEncode(UPDATE_KEY);

        // Creates key-pair for the recoveryCommitment (save private key for next recovery operation)
        const [RECOVERY_KEY, RECOVERY_PRIVATE_KEY] = await Jwk.generateEs256kKeyPair();
        /** Utilizes the RECOVERY_KEY to make the next recovery commitment hash */
        const RECOVERY_COMMITMENT = Multihash.canonicalizeThenHashThenEncode(RECOVERY_KEY);
        
        // create service endpoints:
        const SERVICE1: ServiceEndpointModel = {
            id: '1',
            type: 'service#1',
            endpoint: 'https://url.com'
        }
        const SERVICE2: ServiceEndpointModel = {
            id: '2',
            type: 'service#2',
            endpoint: 'https://url.com'
        }
        const SERVICE_ENDPOINTS = await serviceEndpoints.new([SERVICE1, SERVICE2]);

        /** Input data for the Sidetree request */
        const SIDETREE_REQUEST_INPUT: RequestInput = {
            signingKeys: SIGNING_KEYS,
            serviceEndpoints: SERVICE_ENDPOINTS,
            updateCommitment: UPDATE_COMMITMENT,
            recoveryCommitment: RECOVERY_COMMITMENT
        };
        
        /** Sidetree data to generate a `DID-create` operation */
        const SIDETREE_REQUEST = await DidCreate.sidetreeRequest(SIDETREE_REQUEST_INPUT);
            const OPERATION_BUFFER = Buffer.from(JSON.stringify(SIDETREE_REQUEST));
        
        /** Executes the Sidetree create operation */
        const CREATE_OPERATION = await CreateOperation.parse(OPERATION_BUFFER);
        
        /** Output data from a new Sidetree-based `DID-create` operation */
        const OPERATION_OUTPUT: CreateOperationOutput = {
            sidetreeRequest: SIDETREE_REQUEST,
            operationBuffer: OPERATION_BUFFER,
            createOperation: CREATE_OPERATION,
            signingKeys: SIGNING_KEYS,
            signingPrivateKeys: PRIVATE_SIGNING_KEYS,
            updateKey: UPDATE_KEY,
            updatePrivateKey: UPDATE_PRIVATE_KEY,
            updateRevealValue: UPDATE_COMMITMENT,
            recoveryKey: RECOVERY_KEY,
            recoveryPrivateKey: RECOVERY_PRIVATE_KEY,
            recoveryCommitment: RECOVERY_COMMITMENT,
            serviceEndpoints: SERVICE_ENDPOINTS       
        };
        return new DidCreate(OPERATION_OUTPUT);

    }

    /** Generates the Sidetree data for the `DID-create` operation */
    public static async sidetreeRequest(input: RequestInput): Promise<RequestData> {
        
        const DOCUMENT: DocumentModel = {
            public_keys: input.signingKeys,
            service_endpoints: input.serviceEndpoints
        };
        const PATCH: PatchModel = {
            action: PatchAction.Replace,
            document: DOCUMENT
        };
        
        /** The Create Operation Delta Object */
        const DELTA: DeltaModel = {
            patches: [PATCH],
            updateCommitment: input.updateCommitment
        };
        const DELTA_BUFFER = Buffer.from(JSON.stringify(DELTA));
            const ENCODED_DELTA = Encoder.encode(DELTA_BUFFER);    
            const DELTA_HASH = Encoder.encode(Multihash.hash(DELTA_BUFFER));
        
        /** The Create Operation Suffix Data Object */
        const SUFFIX_DATA: SuffixDataModel = {
            delta_hash: DELTA_HASH,
            recovery_commitment: input.recoveryCommitment
        };
        const ENCODED_SUFFIX_DATA = Encoder.encode(JSON.stringify(SUFFIX_DATA));
        
        /** DID data to generate a new Sidetree-based `DID-create` operation */
        const SIDETREE_REQUEST: RequestData = {
            suffix_data: ENCODED_SUFFIX_DATA,
            type: OperationType.Create,
            delta: ENCODED_DELTA
        };
        return SIDETREE_REQUEST;    
    }

    /** Generates an anchored `DID-create` operation */
    public static async anchoredCreateOperation(input: AnchoredCreateInput): Promise<AnchoredCreateOutput> {
        const CREATE_OPERATION_OUTPUT = await DidCreate.execute();
        
        const ANCHORED_OPERATION_MODEL: AnchoredOperationModel = {
            type: OperationType.Create,
            didUniqueSuffix: CREATE_OPERATION_OUTPUT.createOperation.didUniqueSuffix,
            operationBuffer: CREATE_OPERATION_OUTPUT.operationBuffer,
            transactionNumber: input.transactionNumber,
            transactionTime: input.ledgerTime,
            operationIndex: input.operationIndex
        };
        
        const ANCHORED_OPERATION_OUTPUT: AnchoredCreateOutput = {
            sidetreeRequest: CREATE_OPERATION_OUTPUT.sidetreeRequest,
            operationBuffer: CREATE_OPERATION_OUTPUT.operationBuffer,
            createOperation: CREATE_OPERATION_OUTPUT.createOperation,
            anchoredOperationModel: ANCHORED_OPERATION_MODEL,
            recoveryKey: CREATE_OPERATION_OUTPUT.recoveryKey,
            recoveryPrivateKey: CREATE_OPERATION_OUTPUT.recoveryPrivateKey,
            updateKey: CREATE_OPERATION_OUTPUT.updateKey,
            updatePrivateKey: CREATE_OPERATION_OUTPUT.updatePrivateKey,
            signingKeys: CREATE_OPERATION_OUTPUT.signingKeys,
            signingPrivateKeys: CREATE_OPERATION_OUTPUT.signingPrivateKeys,
            updateRevealValue: CREATE_OPERATION_OUTPUT.updateRevealValue
        };
        return ANCHORED_OPERATION_OUTPUT;
    }
}