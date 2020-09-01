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
import JwkEs256k from '@decentralized-identity/sidetree/dist/lib/core/models/JwkEs256k';
import { Cryptography, OperationKeyPairInput } from '../util/did-keys';
import Multihash from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/Multihash';
import Jws from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/util/Jws';
import { DocumentModel, PatchModel, PatchAction } from '../models/patch-model';
import DeltaModel from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/models/DeltaModel';
import Encoder from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/Encoder';
import { RecoverSignedDataModel } from '../models/signed-data-models';
import { CliInputModel } from '../models/cli-input-model';

/** Generates a Sidetree-based `DID-recover` operation */
export default class DidRecover {
    public readonly did_tyronZIL: TyronZILScheme;
    public readonly sidetreeRequest: SignedDataRequest;
    public readonly operationBuffer: Buffer;
    public readonly recoverOperation: RecoverOperation;
    public readonly type: OperationType.Recover;
    public readonly didUniqueSuffix: string;
    public readonly signedDataJws: Jws;
    public readonly signedData: RecoverSignedDataModel;
    public readonly encodedDelta: string | undefined;
    public readonly delta: DeltaModel | undefined; // undefined when Anchor file mode is ON
    public readonly publicKey: PublicKeyModel[];
    public readonly privateKey: string[];
    public readonly updateKey: JwkEs256k;
    public readonly updatePrivateKey: JwkEs256k;
    public readonly updateCommitment: string;
    public readonly recoveryKey: JwkEs256k;
    public readonly recoveryPrivateKey: JwkEs256k;
    public readonly recoveryCommitment: string;
    public readonly service: ServiceEndpointModel[];

    private constructor (
        operationOutput: RecoverOperationOutput
    ) {
        this.did_tyronZIL = operationOutput.did_tyronZIL;
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
        this.publicKey = operationOutput.publicKey;
        this.privateKey = operationOutput.privateKey;
        this.updateKey = operationOutput.updateKey;
        this.updatePrivateKey = operationOutput.updatePrivateKey;
        this.updateCommitment = operationOutput.updateCommitment;
        this.recoveryKey = operationOutput.recoveryKey;
        this.recoveryPrivateKey = operationOutput.recoveryPrivateKey;
        this.recoveryCommitment = operationOutput.recoveryCommitment;
        this.service = operationOutput.service;
    }

    /** Generates a Sidetree-based `DID-recover` operation */
    public static async execute(input: RecoverOperationInput): Promise<DidRecover> {

        const PUBLIC_KEYS = [];
        const PRIVATE_KEYS = [];

        const PUBLIC_KEY_INPUT = input.cliInput.publicKeyInput;
        
        const PRIMARY_KEY_INPUT = PUBLIC_KEY_INPUT[0];

        /** To create the DID primary public key */
        const KEY_PAIR_INPUT: OperationKeyPairInput = {
            id: PRIMARY_KEY_INPUT.id,
            purpose: PRIMARY_KEY_INPUT.purpose
        }
        // Creates DID primary key-pair:
        const [PRIMARY_KEY, PRIMARY_PRIVATE_KEY] = await Cryptography.operationKeyPair(KEY_PAIR_INPUT);
        PUBLIC_KEYS.push(PRIMARY_KEY);
        PRIVATE_KEYS.push(Encoder.encode(Buffer.from(JSON.stringify(PRIMARY_PRIVATE_KEY))));

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
            PRIVATE_KEYS.push(Encoder.encode(Buffer.from(JSON.stringify(SECONDARY_PRIVATE_KEY))));
        }

        // Creates key-pair for the updateCommitment (save private key for next update operation)
        const [UPDATE_KEY, UPDATE_PRIVATE_KEY] = await Cryptography.jwkPair();
        /** Utilizes the UPDATE_KEY to make the `update reveal value` for the next update operation */
        const UPDATE_COMMITMENT = Multihash.canonicalizeThenHashThenEncode(UPDATE_KEY);

        // Creates key-pair for the recoveryCommitment (save private key for next recovery operation)
        const [RECOVERY_KEY, RECOVERY_PRIVATE_KEY] = await Cryptography.jwkPair();
        /** Utilizes the RECOVERY_KEY to make the next recovery commitment hash */
        const RECOVERY_COMMITMENT = Multihash.canonicalizeThenHashThenEncode(RECOVERY_KEY);

        /***            ****            ****/

        // Add service endpoints:
        const SERVICE = input.cliInput.service;
     
        /** Input data for the Sidetree request */
        const SIDETREE_REQUEST_INPUT: RequestInput = {
            did_tyronZIL: input.did_tyronZIL,
            recoveryPrivateKey: input.recoveryPrivateKey,
            publicKey: PUBLIC_KEYS,
            service: SERVICE,
            updateCommitment: UPDATE_COMMITMENT,
            recoveryCommitment: RECOVERY_COMMITMENT
        };

        /** Sidetree data to generate a `DID-recover` operation */
        const SIDETREE_REQUEST = await DidRecover.sidetreeRequest(SIDETREE_REQUEST_INPUT);
            const OPERATION_BUFFER = Buffer.from(JSON.stringify(SIDETREE_REQUEST));
        
        /** Executes the Sidetree RecoverOperation */
        const RECOVER_OPERATION = await RecoverOperation.parse(OPERATION_BUFFER);
        
        /** Output data from a Sidetree-based `DID-recover` operation */
        const OPERATION_OUTPUT: RecoverOperationOutput = {
            did_tyronZIL: input.did_tyronZIL,
            sidetreeRequest: SIDETREE_REQUEST,
            operationBuffer: OPERATION_BUFFER,
            recoverOperation: RECOVER_OPERATION,
            publicKey: PUBLIC_KEYS,
            privateKey: PRIVATE_KEYS,
            updateKey: UPDATE_KEY,
            updatePrivateKey: UPDATE_PRIVATE_KEY,
            updateCommitment: UPDATE_COMMITMENT,
            recoveryKey: RECOVERY_KEY,
            recoveryPrivateKey: RECOVERY_PRIVATE_KEY,
            recoveryCommitment: RECOVERY_COMMITMENT,
            service: SERVICE   
        };
        return new DidRecover(OPERATION_OUTPUT);
    }

    /** Generates the Sidetree data for the `DID-recover` operation */
    public static async sidetreeRequest(input: RequestInput): Promise<SignedDataRequest> {
        
        const DOCUMENT: DocumentModel = {
            public_keys: input.publicKey,
            service_endpoints: input.service
        };
        const PATCH: PatchModel = {
            action: PatchAction.Replace,
            document: DOCUMENT
        };
        
        /** The Recovery Operation Delta Object */
        const DELTA: DeltaModel = {
            patches: [PATCH],
            updateCommitment: input.updateCommitment
        };
        const DELTA_BUFFER = Buffer.from(JSON.stringify(DELTA));
            const ENCODED_DELTA = Encoder.encode(DELTA_BUFFER);    
            const DELTA_HASH = Encoder.encode(Multihash.hash(DELTA_BUFFER));
        
        /** To create the Recovery Operation Signed Data Object */
        const SIGNED_DATA: RecoverSignedDataModel = {
            delta_hash: DELTA_HASH,
            recovery_key: Cryptography.getPublicKey(input.recoveryPrivateKey),
            recovery_commitment: input.recoveryCommitment
        };
        const recoveryNoKid = input.recoveryPrivateKey;
        const SIGNED_DATA_JWS = await Cryptography.signUsingEs256k(SIGNED_DATA, recoveryNoKid);
        
        /** DID data to generate a Sidetree RecoverOperation */
        const SIDETREE_REQUEST: SignedDataRequest = {
            did_suffix: input.did_tyronZIL.didUniqueSuffix,
            signed_data: SIGNED_DATA_JWS,
            type: OperationType.Recover,
            delta: ENCODED_DELTA,
        };
        return SIDETREE_REQUEST;
    }
}

/***            ** interfaces **            ***/

/** Defines input data for a Sidetree-based `DID-recover` operation */
export interface RecoverOperationInput {
    did_tyronZIL: TyronZILScheme;
    recoveryPrivateKey: JwkEs256k;
    cliInput: CliInputModel;
}

/** Defines output data of a Sidetree-based `DID-recover` operation */
interface RecoverOperationOutput {
    did_tyronZIL: TyronZILScheme;
    sidetreeRequest: SignedDataRequest;
    operationBuffer: Buffer;
    recoverOperation: RecoverOperation;
    publicKey: PublicKeyModel[];
    privateKey: string[];
    updateKey: JwkEs256k;
    updatePrivateKey: JwkEs256k;
    updateCommitment: string;
    recoveryKey: JwkEs256k;
    recoveryPrivateKey: JwkEs256k;
    recoveryCommitment: string;
    service: ServiceEndpointModel[];
}

/** Defines input data for a Sidetree-based `DID-recover` operation REQUEST*/
interface RequestInput {
    did_tyronZIL: TyronZILScheme;
    recoveryPrivateKey: JwkEs256k;
    publicKey: PublicKeyModel[];
    service?: ServiceEndpointModel[];
    updateCommitment: string;
    recoveryCommitment: string;
}

/** Defines data for a Sidetree RecoverOperation REQUEST*/
interface SignedDataRequest {
    did_suffix: string;
    signed_data: string;
    type: OperationType.Recover;
    delta: string;
}
