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
import RecoverOperation from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/RecoverOperation';
import JwkEs256k from "@decentralized-identity/sidetree/dist/lib/core/models/JwkEs256k";
import PublicKeyModel from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/models/PublicKeyModel';
import ServiceEndpointModel from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/models/ServiceEndpointModel';
import {
    Cryptography,
    OperationKeyPairInput
 } from '../did-keys';
import Multihash from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/Multihash';
import Jwk from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/util/Jwk';
import serviceEndpoints from '../service-endpoints';
import DocumentModel from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/models/DocumentModel';
import { PatchModel, PatchAction } from '../models/did-patches';
import DeltaModel from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/models/DeltaModel';
import Encoder from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/Encoder';
import { RecoverSignedDataModel } from '../models/signed-data-model';

/** Defines input data for a Sidetree-based `DID-recover` operation */
interface RecoverOperationInput {
    didUniqueSuffix: string;
    recoveryPrivateKey: JwkEs256k;
}

/** Defines output data of a Sidetree-based `DID-recover` operation */
interface RecoverOperationOutput {
    operationRequest: RequestOutput;
    operationBuffer: Buffer;
    recoverOperation: RecoverOperation;
    signingKeys: PublicKeyModel[];
    signingPrivateKeys: JwkEs256k[];
    nextUpdateKey: JwkEs256k;
    nextUpdatePrivateKey: JwkEs256k;
    nextUpdateRevealValue: string;
    newRecoveryKey: JwkEs256k;
    newRecoveryPrivateKey: JwkEs256k;
    newRecoveryCommitment: string;
}

/** Defines input data for a Sidetree-based `DID-recover` operation REQUEST*/
interface RequestInput {
    didUniqueSuffix: string;
    recoveryPrivateKey: JwkEs256k;
    mainPublicKeys: PublicKeyModel[];
    serviceEndpoints?: ServiceEndpointModel[];
    nextUpdateCommitment: string;
    newRecoveryCommitment: string;
}

/** Defines output data of a Sidetree-based `DID-recover` operation REQUEST*/
interface RequestOutput {
    type: OperationType.Recover;
    didUniqueSuffix: string;
    encodedDelta: string;
    signed_data: string;
}


/** Generates a Sidetree-based `DID-recover` operation */
export default class DidRecover {
    public readonly operationRequest: RequestOutput;
    public readonly operationBuffer: Buffer;
    public readonly recoverOperation: RecoverOperation;
    public readonly type: OperationType.Recover;
    public readonly signingKeys: PublicKeyModel[];
    public readonly signingPrivateKeys: JwkEs256k[];
    public readonly nextUpdateKey: JwkEs256k;
    public readonly nextUpdatePrivateKey: JwkEs256k;
    public readonly nextUpdateRevealValue: string;
    public readonly newRecoveryKey: JwkEs256k;
    public readonly newRecoveryPrivateKey: JwkEs256k;
    public readonly newRecoveryCommitment: string;
    
    private constructor (
        operationOutput: RecoverOperationOutput
    ) {
        this.operationRequest = operationOutput.operationRequest;
        this.operationBuffer = operationOutput.operationBuffer;
        this.recoverOperation = operationOutput.recoverOperation;
        this.type = OperationType.Recover;
        this.signingKeys = operationOutput.signingKeys;
        this.signingPrivateKeys = operationOutput.signingPrivateKeys;
        this.nextUpdateKey = operationOutput.nextUpdateKey;
        this.nextUpdatePrivateKey = operationOutput.nextUpdatePrivateKey;
        this.nextUpdateRevealValue = operationOutput.nextUpdateRevealValue;
        this.newRecoveryKey = operationOutput.newRecoveryKey;
        this.newRecoveryPrivateKey = operationOutput.newRecoveryPrivateKey;
        this.newRecoveryCommitment = operationOutput.newRecoveryCommitment;
    }

    /** Generates a Sidetree-based `DID-recover` operation */
    public static async execute(input: RecoverOperationInput): Promise<DidRecover> {

        /** To create the DID main public key */
        const SIGNING_KEY_INPUT: OperationKeyPairInput = {
            id: 'signingKey',
        };
        // Creates DID main key-pair:
        const [SIGNING_KEY, SIGNING_PRIVATE_KEY] = await Cryptography.operationKeyPair(SIGNING_KEY_INPUT);
        
        // Creates key-pair for the updateCommitment (save private key for next update operation)
        const [NEXT_UPDATE_KEY, NEXT_UPDATE_PRIVATE_KEY] = await Jwk.generateEs256kKeyPair();
        /** Utilizes the UPDATE_KEY to make the `update reveal value` for the next update operation */
        const NEXT_UPDATE_COMMITMENT = Multihash.canonicalizeThenHashThenEncode(NEXT_UPDATE_KEY);

        // Creates key-pair for the recoveryCommitment (save private key for next recovery operation)
        const [NEW_RECOVERY_KEY, NEW_RECOVERY_PRIVATE_KEY] = await Jwk.generateEs256kKeyPair();
        /** Utilizes the NEW_RECOVERY_KEY to make a new recovery commitment hash */
        const NEW_RECOVERY_COMMITMENT = Multihash.canonicalizeThenHashThenEncode(NEW_RECOVERY_KEY);
        
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

        /** Input data for the operation-request */
        const OPERATION_REQUEST_INPUT: RequestInput = {
            didUniqueSuffix: input.didUniqueSuffix,
            recoveryPrivateKey: input.recoveryPrivateKey,
            mainPublicKeys: [SIGNING_KEY],
            serviceEndpoints: SERVICE_ENDPOINTS,
            nextUpdateCommitment: NEXT_UPDATE_COMMITMENT,
            newRecoveryCommitment: NEW_RECOVERY_COMMITMENT
        };

        /** DID data to generate a Sidetree-based `DID-recover` operation */
        const OPERATION_REQUEST = await DidRecover.operationRequest(OPERATION_REQUEST_INPUT);
            const OPERATION_BUFFER = Buffer.from(JSON.stringify(OPERATION_REQUEST));
        
        /** Executes the Sidetree recover operation */
        const RECOVER_OPERATION = await RecoverOperation.parse(OPERATION_BUFFER);
        
        /** Output data from a Sidetree-based `DID-recover` operation */
        const OPERATION_OUTPUT: RecoverOperationOutput = {
            operationRequest: OPERATION_REQUEST,
            operationBuffer: OPERATION_BUFFER,
            recoverOperation: RECOVER_OPERATION,
            signingKeys: [SIGNING_KEY],
            signingPrivateKeys: [SIGNING_PRIVATE_KEY],
            nextUpdateKey: NEXT_UPDATE_KEY,
            nextUpdatePrivateKey: NEXT_UPDATE_PRIVATE_KEY,
            nextUpdateRevealValue: NEXT_UPDATE_COMMITMENT,
            newRecoveryKey: NEW_RECOVERY_KEY,
            newRecoveryPrivateKey: NEW_RECOVERY_PRIVATE_KEY,
            newRecoveryCommitment: NEW_RECOVERY_COMMITMENT     
        };
        return new DidRecover(OPERATION_OUTPUT);
    }

    /** Generates a Sidetree-based `DID-recover` operation REQUEST  */
    public static async operationRequest(input: RequestInput): Promise<RequestOutput> {
        
        const DOCUMENT: DocumentModel = {
            public_keys: input.mainPublicKeys,
            service_endpoints: input.serviceEndpoints
        };
        const PATCH: PatchModel = {
            action: PatchAction.Replace,
            document: DOCUMENT
        };
        
        /** The Recovery Operation Delta Object */
        const DELTA: DeltaModel = {
            patches: [PATCH],
            updateCommitment: input.nextUpdateCommitment
        };
        const DELTA_BUFFER = Buffer.from(JSON.stringify(DELTA));
            const ENCODED_DELTA = Encoder.encode(DELTA_BUFFER);    
            const DELTA_HASH = Encoder.encode(Multihash.hash(DELTA_BUFFER));
        
        /** To create the Recovery Operation Signed Data Object */
        const SIGNED_DATA: RecoverSignedDataModel = {
            delta_hash: DELTA_HASH,
            recovery_key: Jwk.getEs256kPublicKey(input.recoveryPrivateKey),
            recovery_commitment: input.newRecoveryCommitment
        };
        const SIGNED_DATA_JWS = await Cryptography.signUsingEs256k(SIGNED_DATA, input.recoveryPrivateKey);
        
        /** DID data to generate a Sidetree-based `DID-recover` operation */
        const OPERATION_REQUEST: RequestOutput = {
            type: OperationType.Recover,
            didUniqueSuffix: input.didUniqueSuffix,
            encodedDelta: ENCODED_DELTA,
            signed_data: SIGNED_DATA_JWS
        };
        return OPERATION_REQUEST;
    }
}
