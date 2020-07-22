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

import { Cryptography, OperationKeyPairInput, JwkEs256k } from '../did-keys';
import { PublicKeyModel, Operation, Recovery, SidetreeVerificationRelationship } from '../models/verification-method-models';
import { CLICreateInput } from '../models/cli-create-input-model';
import TyronZILScheme from '../tyronZIL-schemes/did-scheme';
import { SchemeInputData } from '../tyronZIL-schemes/did-scheme';
import Multihash from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/Multihash';
import Encoder from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/Encoder';
import ServiceEndpointModel from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/models/ServiceEndpointModel';
import serviceEndpoints from '../service-endpoints';
import { DocumentModel, PatchModel, PatchAction } from '../models/patch-model';
import DeltaModel from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/models/DeltaModel';
import SuffixDataModel from '../models/suffix-data-model';

/** Defines output data for a Sidetree-based `DID-create` operation */
interface CreateOperationOutput {
    sidetreeRequest: RequestData;
    operationBuffer: Buffer;
    createOperation: CreateOperation;
    publicKey: PublicKeyModel[];
    privateKey: JwkEs256k[];
    operation: Operation;   // verification method
    recovery: Recovery;     // verification method
    updateKey: JwkEs256k;
    updatePrivateKey: JwkEs256k;
    updateRevealValue: string;
    recoveryKey: JwkEs256k;
    recoveryPrivateKey: JwkEs256k;
    recoveryCommitment: string;
    service: ServiceEndpointModel[];
}

/** Defines input data for a Sidetree-based `DID-create` operation REQUEST*/
interface RequestInput {
    publicKey: PublicKeyModel[];
    service?: ServiceEndpointModel[];
    updateCommitment: string;
    recoveryCommitment: string;
}

/** Defines data for a Sidetree CreateOperation REQUEST*/
interface RequestData {
    suffix_data: string;
    type?: OperationType.Create;
    delta?: string;
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
    public readonly publicKey: PublicKeyModel[];
    public readonly privateKey: JwkEs256k[];
    public readonly operation: Operation;
    public readonly recovery: Recovery;
    public readonly updateKey: JwkEs256k;
    public readonly updatePrivateKey: JwkEs256k;
    public readonly updateRevealValue: string;
    public readonly recoveryKey: JwkEs256k;
    public readonly recoveryPrivateKey: JwkEs256k;
    public readonly recoveryCommitment: string;
    public readonly service: ServiceEndpointModel[];

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
        this.publicKey = operationOutput.publicKey;
        this.privateKey = operationOutput.privateKey;
        this.operation = operationOutput.operation;
        this.recovery = operationOutput.recovery;
        this.updateKey = operationOutput.updateKey;
        this.updatePrivateKey = operationOutput.updatePrivateKey;
        this.updateRevealValue = operationOutput.updateRevealValue;
        this.recoveryKey = operationOutput.recoveryKey;
        this.recoveryPrivateKey = operationOutput.recoveryPrivateKey;
        this.recoveryCommitment = operationOutput.recoveryCommitment;
        this.service = operationOutput.service;
    }

    /** Generates a Sidetree-based `DID-create` operation with input from the CLI */
    public static async executeCli(input: CLICreateInput): Promise<DidCreate> {
        
        const PUBLIC_KEYS = [];
        const PRIVATE_KEYS = [];

        const PUBLIC_KEY_INPUT = input.publicKeyInput;
        
        const PRIMARY_KEY_INPUT = PUBLIC_KEY_INPUT[0];

        /** To create the DID primary public key */
        const KEY_PAIR_INPUT: OperationKeyPairInput = {
            id: PRIMARY_KEY_INPUT.id,
            purpose: PRIMARY_KEY_INPUT.purpose
        }
        // Creates DID primary key-pair:
        const [PRIMARY_KEY, PRIMARY_PRIVATE_KEY] = await Cryptography.operationKeyPair(KEY_PAIR_INPUT);
        PUBLIC_KEYS.push(PRIMARY_KEY);
        PRIVATE_KEYS.push(PRIMARY_PRIVATE_KEY);

        if (PUBLIC_KEY_INPUT.length === 2) {
            const SECONDARY_KEY_INPUT = PUBLIC_KEY_INPUT[1];
            
            /** To create the DID secondary public key */
            const KEY_PAIR_INPUT: OperationKeyPairInput = {
                id: SECONDARY_KEY_INPUT.id,
                purpose: SECONDARY_KEY_INPUT.purpose
            }
            // Creates DID secondary key-pair:
            const [SECONDARY_KEY, SECONDARY_PRIVATE_KEY] = await Cryptography.operationKeyPair(KEY_PAIR_INPUT);
            PUBLIC_KEYS.push(SECONDARY_KEY);
            PRIVATE_KEYS.push(SECONDARY_PRIVATE_KEY);
        }

        // Creates key-pair for the updateCommitment (save private key for next update operation)
        const [UPDATE_KEY, UPDATE_PRIVATE_KEY] = await Cryptography.jwkPair();
        /** Utilizes the UPDATE_KEY to make the `update reveal value` for the next update operation */
        const UPDATE_COMMITMENT = Multihash.canonicalizeThenHashThenEncode(UPDATE_KEY);

        // Creates key-pair for the recoveryCommitment (save private key for next recovery operation)
        const [RECOVERY_KEY, RECOVERY_PRIVATE_KEY] = await Cryptography.jwkPair();
        /** Utilizes the RECOVERY_KEY to make the next recovery commitment hash */
        const RECOVERY_COMMITMENT = Multihash.canonicalizeThenHashThenEncode(RECOVERY_KEY);


        // create service endpoints:
        const SERVICE1: ServiceEndpointModel = {
            id: 'tyronZIL-website',
            type: 'method-specification',
            endpoint: 'https://tyronZIL.com'
        }
        const SERVICE2: ServiceEndpointModel = {
            id: 'ZIL-address',
            type: 'cryptocurrency-address',
            endpoint: 'zil1egvj6ketfydy48uqzu8qphhj5w4xrkratv85ht'
        }
        const SERVICE_ENDPOINTS = await serviceEndpoints.new([SERVICE1, SERVICE2]);

        /** Input data for the Sidetree request */
        const SIDETREE_REQUEST_INPUT: RequestInput = {
            publicKey: PUBLIC_KEYS,
            service: SERVICE_ENDPOINTS,
            updateCommitment: UPDATE_COMMITMENT,
            recoveryCommitment: RECOVERY_COMMITMENT
        };
        
        /** Sidetree data to generate a `DID-create` operation */
        const SIDETREE_REQUEST = await DidCreate.sidetreeRequest(SIDETREE_REQUEST_INPUT);
            const OPERATION_BUFFER = Buffer.from(JSON.stringify(SIDETREE_REQUEST));
        
        /** Executes the Sidetree create operation */
        const CREATE_OPERATION = await CreateOperation.parse(OPERATION_BUFFER);
        const DID_SUFFIX = CREATE_OPERATION.didUniqueSuffix;

        const SCHEME_DATA: SchemeInputData = {
            network: input.network,
            didUniqueSuffix: DID_SUFFIX
        };

        const DID_tyronZIL = await TyronZILScheme.newDID(SCHEME_DATA);

        const VM_OPERATION = await this.generateVMOperation(UPDATE_KEY, DID_tyronZIL);
        const VM_RECOVERY = await this.generateVMRecovery(RECOVERY_KEY, DID_tyronZIL);

        /** Output data from a new Sidetree-based `DID-create` operation */
        const OPERATION_OUTPUT: CreateOperationOutput = {
            sidetreeRequest: SIDETREE_REQUEST,
            operationBuffer: OPERATION_BUFFER,
            createOperation: CREATE_OPERATION,
            publicKey: PUBLIC_KEYS,
            privateKey: PRIVATE_KEYS,
            operation: VM_OPERATION,
            recovery: VM_RECOVERY,
            updateKey: UPDATE_KEY,
            updatePrivateKey: UPDATE_PRIVATE_KEY,
            updateRevealValue: UPDATE_COMMITMENT,
            recoveryKey: RECOVERY_KEY,
            recoveryPrivateKey: RECOVERY_PRIVATE_KEY,
            recoveryCommitment: RECOVERY_COMMITMENT,
            service: SERVICE_ENDPOINTS       
        };
        return new DidCreate(OPERATION_OUTPUT);

    }

    /** Generates an Operation verification-method instance */
    public static async generateVMOperation(updateKey: JwkEs256k, did: TyronZILScheme): Promise<Operation> {
        const ID = did.did_tyronZIL + '#' + updateKey.kid;
        const TYPE = 'EcdsaSecp256k1VerificationKey2019';
        const JWK = updateKey;
        
        const VM_OPERATION: Operation = {
            id: ID,
            type: TYPE,
            jwk: JWK,
            purpose: SidetreeVerificationRelationship.Operation
        }
        return VM_OPERATION;
    }

    /** Generates a Recovery verification-method instance */
    public static async generateVMRecovery(recoveryKey: JwkEs256k, did: TyronZILScheme): Promise<Recovery> {
        const ID = did.did_tyronZIL + '#' + recoveryKey.kid;
        const TYPE = 'EcdsaSecp256k1VerificationKey2019';
        const JWK = recoveryKey;
        
        const VM_RECOVERY: Recovery = {
            id: ID,
            type: TYPE,
            jwk: JWK,
            purpose: SidetreeVerificationRelationship.Recovery
        }
        return VM_RECOVERY;
    }

    /** Generates the Sidetree data for the `DID-create` operation */
    public static async sidetreeRequest(input: RequestInput): Promise<RequestData> {
        
        const DOCUMENT: DocumentModel = {
            public_keys: input.publicKey,
            service_endpoints: input.service
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
}