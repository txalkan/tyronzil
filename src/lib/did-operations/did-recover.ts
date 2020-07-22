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
import OperationType from '@decentralized-identity/sidetree/dist/lib/core/enums/OperationType';
import RecoverOperation from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/RecoverOperation';
import { PublicKeyModel } from '../models/verification-method-models';
import ServiceEndpointModel from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/models/ServiceEndpointModel';
import { Cryptography, OperationKeyPairInput, JwkEs256k } from '../did-keys';
import Multihash from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/Multihash';
import Jws from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/util/Jws';
import serviceEndpoints from '../service-endpoints';
import { DocumentModel, PatchModel, PatchAction } from '../models/patch-model';
import DeltaModel from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/models/DeltaModel';
import Encoder from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/Encoder';
import { RecoverSignedDataModel } from '../models/signed-data-models';

/** Defines input data for a Sidetree-based `DID-recover` operation */
interface RecoverOperationInput {
    type: OperationType.Recover;
    didTyronZIL: TyronZILScheme;
    recoveryPrivateKey: JwkEs256k;
}

/** Defines output data of a Sidetree-based `DID-recover` operation */
interface RecoverOperationOutput {
    sidetreeRequest: RequestData;
    operationBuffer: Buffer;
    recoverOperation: RecoverOperation;
    signingKeys: PublicKeyModel[];
    signingPrivateKeys: JwkEs256k[];
    nextUpdateKey: JwkEs256k;
    nextUpdatePrivateKey: JwkEs256k;
    nextUpdateRevealValue: string;
    nextRecoveryKey: JwkEs256k;
    nextRecoveryPrivateKey: JwkEs256k;
    nextRecoveryCommitment: string;
}

/** Defines input data for a Sidetree-based `DID-recover` operation REQUEST*/
interface RequestInput {
    didTyronZIL: TyronZILScheme;
    recoveryPrivateKey: JwkEs256k;
    mainPublicKeys: PublicKeyModel[];
    serviceEndpoints?: ServiceEndpointModel[];
    nextUpdateCommitment: string;
    nextRecoveryCommitment: string;
}

/** Defines data for a Sidetree RecoverOperation REQUEST*/
interface RequestData {
    did_suffix: string;
    signed_data: string;
    type?: OperationType.Recover;
    delta?: string;
}


/** Generates a Sidetree-based `DID-recover` operation */
export default class DidRecover {
    public readonly sidetreeRequest: RequestData;
    public readonly operationBuffer: Buffer;
    public readonly recoverOperation: RecoverOperation;
    public readonly type: OperationType.Recover;
    public readonly didUniqueSuffix: string;
    public readonly signedDataJws: Jws;
    public readonly signedData: RecoverSignedDataModel;
    public readonly encodedDelta: string | undefined;
    public readonly delta: DeltaModel | undefined; // undefined when Anchor file mode is ON
    public readonly signingKeys: PublicKeyModel[];
    public readonly signingPrivateKeys: JwkEs256k[];
    public readonly nextUpdateKey: JwkEs256k;
    public readonly nextUpdatePrivateKey: JwkEs256k;
    public readonly nextUpdateRevealValue: string;
    public readonly nextRecoveryKey: JwkEs256k;
    public readonly nextRecoveryPrivateKey: JwkEs256k;
    public readonly nextRecoveryCommitment: string;

    private constructor (
        operationOutput: RecoverOperationOutput
    ) {
        this.sidetreeRequest = operationOutput.sidetreeRequest;
        this.operationBuffer = operationOutput.operationBuffer;
        this.recoverOperation = operationOutput.recoverOperation;
        this.type = OperationType.Recover;
        this.didUniqueSuffix = operationOutput.recoverOperation.didUniqueSuffix;
        this.signedDataJws = operationOutput.recoverOperation.signedDataJws;
        this.signedData = {
            delta_hash: operationOutput.recoverOperation.signedData.deltaHash,
            recovery_key:operationOutput.recoverOperation.signedData.recoveryKey,
            recovery_commitment: operationOutput.recoverOperation.signedData.recoveryCommitment
        };
        this.encodedDelta = operationOutput.recoverOperation.encodedDelta;
        this.delta = operationOutput.recoverOperation.delta;
        this.signingKeys = operationOutput.signingKeys;
        this.signingPrivateKeys = operationOutput.signingPrivateKeys;
        this.nextUpdateKey = operationOutput.nextUpdateKey;
        this.nextUpdatePrivateKey = operationOutput.nextUpdatePrivateKey;
        this.nextUpdateRevealValue = operationOutput.nextUpdateRevealValue;
        this.nextRecoveryKey = operationOutput.nextRecoveryKey;
        this.nextRecoveryPrivateKey = operationOutput.nextRecoveryPrivateKey;
        this.nextRecoveryCommitment = operationOutput.nextRecoveryCommitment;
    }

    /** Generates a Sidetree-based `DID-recover` operation */
    public static async execute(input: RecoverOperationInput): Promise<DidRecover> {

        /** To create the DID main public key */
        const SIGNING_KEY_INPUT: OperationKeyPairInput = {
            id: 'signingKey',
        };
        // Creates DID main key-pair:
        const [SIGNING_KEY, SIGNING_PRIVATE_KEY] = await Cryptography.operationKeyPair(SIGNING_KEY_INPUT);
        
        // Creates key-pair for the update commitment (save private key for next update operation)
        const [NEXT_UPDATE_KEY, NEXT_UPDATE_PRIVATE_KEY] = await Cryptography.jwkPair();
        /** Utilizes the UPDATE_KEY to make the `update reveal value` for the next update operation */
        const NEXT_UPDATE_COMMITMENT = Multihash.canonicalizeThenHashThenEncode(NEXT_UPDATE_KEY);

        // Creates key-pair for the recovery commitment (save private key for next recovery operation)
        const [NEXT_RECOVERY_KEY, NEXT_RECOVERY_PRIVATE_KEY] = await Cryptography.jwkPair();
        /** Utilizes the NEXT_RECOVERY_KEY to make a new recovery commitment hash */
        const NEXT_RECOVERY_COMMITMENT = Multihash.canonicalizeThenHashThenEncode(NEXT_RECOVERY_KEY);
        
        // To create service endpoints:
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
        // Creates services:
        const SERVICE_ENDPOINTS = await serviceEndpoints.new([SERVICE1, SERVICE2]);

        /** Input data for the Sidetree request */
        const SIDETREE_REQUEST_INPUT: RequestInput = {
            didTyronZIL: input.didTyronZIL,
            recoveryPrivateKey: input.recoveryPrivateKey,
            mainPublicKeys: [SIGNING_KEY],
            serviceEndpoints: SERVICE_ENDPOINTS,
            nextUpdateCommitment: NEXT_UPDATE_COMMITMENT,
            nextRecoveryCommitment: NEXT_RECOVERY_COMMITMENT
        };

        /** Sidetree data to generate a `DID-recover` operation */
        const SIDETREE_REQUEST = await DidRecover.sidetreeRequest(SIDETREE_REQUEST_INPUT);
            const OPERATION_BUFFER = Buffer.from(JSON.stringify(SIDETREE_REQUEST));
        
        /** Executes the Sidetree recover operation */
        const RECOVER_OPERATION = await RecoverOperation.parse(OPERATION_BUFFER);
        
        /** Output data from a Sidetree-based `DID-recover` operation */
        const OPERATION_OUTPUT: RecoverOperationOutput = {
            sidetreeRequest: SIDETREE_REQUEST,
            operationBuffer: OPERATION_BUFFER,
            recoverOperation: RECOVER_OPERATION,
            signingKeys: [SIGNING_KEY],
            signingPrivateKeys: [SIGNING_PRIVATE_KEY],
            nextUpdateKey: NEXT_UPDATE_KEY,
            nextUpdatePrivateKey: NEXT_UPDATE_PRIVATE_KEY,
            nextUpdateRevealValue: NEXT_UPDATE_COMMITMENT,
            nextRecoveryKey: NEXT_RECOVERY_KEY,
            nextRecoveryPrivateKey: NEXT_RECOVERY_PRIVATE_KEY,
            nextRecoveryCommitment: NEXT_RECOVERY_COMMITMENT     
        };
        return new DidRecover(OPERATION_OUTPUT);
    }

    /** Generates the Sidetree data for the `DID-recover` operation */
    public static async sidetreeRequest(input: RequestInput): Promise<RequestData> {
        
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
            recovery_key: Cryptography.getPublicKey(input.recoveryPrivateKey),
            recovery_commitment: input.nextRecoveryCommitment
        };
        const SIGNED_DATA_JWS = await Cryptography.signUsingEs256k(input.didTyronZIL, SIGNED_DATA, input.recoveryPrivateKey);
        
        /** DID data to generate a Sidetree-based `DID-recover` operation */
        const SIDETREE_REQUEST: RequestData = {
            did_suffix: input.didTyronZIL.didUniqueSuffix,
            signed_data: SIGNED_DATA_JWS,
            type: OperationType.Recover,
            delta: ENCODED_DELTA,
        };
        return SIDETREE_REQUEST;
    }
}
