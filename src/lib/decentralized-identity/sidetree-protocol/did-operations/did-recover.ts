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
import { PublicKeyModel } from '../models/verification-method-models';
import ServiceEndpointModel from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/models/ServiceEndpointModel';
import JwkEs256k from '@decentralized-identity/sidetree/dist/lib/core/models/JwkEs256k';
import { Cryptography, OperationKeyPairInput } from '../../util/did-keys';
import Multihash from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/Multihash';
import { DocumentModel, PatchModel, PatchAction } from '../models/patch-model';
import DeltaModel from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/models/DeltaModel';
import Encoder from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/Encoder';
import { RecoverSignedDataModel } from '../models/signed-data-models';
import { CliInputModel } from '../../../../bin/util';

/** Generates a Sidetree-based `DID-recover` operation */
export default class DidRecover {
    public readonly type = OperationType.Recover;
    public readonly did_tyronZIL: string;
    public readonly newUpdateCommitment: string;
    public readonly newRecoveryCommitment: string;
    public readonly sidetreeRequest: Buffer;
    /** The result from the Sidetree request */
    public readonly recoverOperation: RecoverOperation;
    /** The encoded Delta Object */
    public readonly delta: string;
    public readonly privateKey: string[];
    public readonly newUpdatePrivateKey: JwkEs256k;
    public readonly newRecoveryPrivateKey: JwkEs256k;
    
    /***            ****            ***/

    private constructor (
        operation: RecoverOperationModel
    ) {
        this.did_tyronZIL = operation.did_tyronZIL;
        this.newUpdateCommitment = operation.newUpdateCommitment;
        this.newRecoveryCommitment = operation.newRecoveryCommitment;
        this.sidetreeRequest = operation.sidetreeRequest;
        this.recoverOperation = operation.recoverOperation;
        this.delta = this.recoverOperation.encodedDelta!;
        this.privateKey = operation.privateKey;
        this.newUpdatePrivateKey = operation.newUpdatePrivateKey;
        this.newRecoveryPrivateKey = operation.newRecoveryPrivateKey;
    }

    /** Generates a Sidetree-based `DID-recover` operation */
    public static async execute(input: RecoverOperationInput): Promise<DidRecover|void> {
        const PUBLIC_KEYS = [];
        const PRIVATE_KEYS = [];

        const PUBLIC_KEY_INPUT = input.cliInput.publicKeyInput;
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
            did: input.did_tyronZIL,
            recoveryPrivateKey: input.recoveryPrivateKey,
            publicKey: PUBLIC_KEYS,
            service: input.cliInput.service,
            newUpdateCommitment: UPDATE_COMMITMENT,
            newRecoveryCommitment: RECOVERY_COMMITMENT
        };

        /** Sidetree data to generate a `DID-recover` operation */
        const SIDETREE_REQUEST = await DidRecover.sidetreeRequest(SIDETREE_REQUEST_INPUT);
        const SIDETREE_REQUEST_BUFFER = Buffer.from(JSON.stringify(SIDETREE_REQUEST));
        
        /** Executes the Sidetree RecoverOperation */
        const RECOVER_OPERATION = await RecoverOperation.parse(SIDETREE_REQUEST_BUFFER);
        
        /** Output data from a Sidetree-based `DID-recover` operation */
        const OPERATION_OUTPUT: RecoverOperationModel = {
            did_tyronZIL: input.did_tyronZIL,
            newUpdateCommitment: UPDATE_COMMITMENT,
            newRecoveryCommitment: RECOVERY_COMMITMENT,
            sidetreeRequest: SIDETREE_REQUEST_BUFFER,
            recoverOperation: RECOVER_OPERATION,
            privateKey: PRIVATE_KEYS,
            newUpdatePrivateKey: UPDATE_PRIVATE_KEY,
            newRecoveryPrivateKey: RECOVERY_PRIVATE_KEY   
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
        const DELTA_OBJECT: DeltaModel = {
            patches: [PATCH],
            updateCommitment: input.newUpdateCommitment
        };
        const DELTA_BUFFER = Buffer.from(JSON.stringify(DELTA_OBJECT));
        const DELTA = Encoder.encode(DELTA_BUFFER);    
        const DELTA_HASH = Encoder.encode(Multihash.hash(DELTA_BUFFER));
        
        /** For the Recovery Operation Signed Data Object */
        const SIGNED_DATA: RecoverSignedDataModel = {
            delta_hash: DELTA_HASH,
            recovery_key: Cryptography.getPublicKey(input.recoveryPrivateKey),
            recovery_commitment: input.newRecoveryCommitment
        };
        const SIGNED_DATA_JWS = await Cryptography.signUsingEs256k(SIGNED_DATA, input.recoveryPrivateKey);

        /** DID data to generate a Sidetree RecoverOperation */
        const SIDETREE_REQUEST: SignedDataRequest = {
            did_suffix: input.did,
            signed_data: SIGNED_DATA_JWS,
            type: OperationType.Recover,
            delta: DELTA
        };
        return SIDETREE_REQUEST;
    }
}

/***            ** interfaces **            ***/

/** Defines input data for a Sidetree-based `DID-recover` operation */
export interface RecoverOperationInput {
    did_tyronZIL: string;
    recoveryPrivateKey: JwkEs256k;
    cliInput: CliInputModel;
}

/** Defines output data of a Sidetree-based `DID-recover` operation */
interface RecoverOperationModel {
    did_tyronZIL: string;
    newUpdateCommitment: string;
    newRecoveryCommitment: string;
    sidetreeRequest: Buffer;
    recoverOperation: RecoverOperation;
    privateKey: string[];
    newUpdatePrivateKey: JwkEs256k;
    newRecoveryPrivateKey: JwkEs256k;
}

/** Defines input data for a Sidetree-based `DID-recover` operation REQUEST*/
interface RequestInput {
    did: string;
    recoveryPrivateKey: JwkEs256k;
    publicKey: PublicKeyModel[];
    service?: ServiceEndpointModel[];
    newUpdateCommitment: string;
    newRecoveryCommitment: string;
}

/** Defines data for a Sidetree RecoverOperation REQUEST*/
interface SignedDataRequest {
    did_suffix: string;
    signed_data: string;
    type: OperationType.Recover;
    delta: string;
}
