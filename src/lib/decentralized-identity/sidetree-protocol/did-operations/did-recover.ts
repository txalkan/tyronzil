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

import * as zcrypto from '@zilliqa-js/crypto';

import { PublicKeyModel } from '../models/verification-method-models';
import ServiceEndpointModel from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/models/ServiceEndpointModel';
import { Cryptography, OperationKeyPairInput } from '../../util/did-keys';
import Multihash from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/Multihash';
import { DocumentModel, PatchModel, PatchAction } from '../models/patch-model';
import Encoder from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/Encoder';
import { RecoverSignedDataModel, SignedDataRequest } from '../models/signed-data-models';
import { CliInputModel } from '../../../../bin/util';
import { OperationType, DeltaModel } from '../sidetree';

/** Generates a Sidetree-Tyron `DID-Recover` operation */
export default class DidRecover {
    public readonly type = OperationType.Recover;
    public readonly decentralized_identifier: string;
    public readonly signedRequest: SignedDataRequest;
    public readonly newUpdateKey: string;
    public readonly newRecoveryKey: string;
    public readonly privateKey: string[];
    public readonly newUpdatePrivateKey: string;
    public readonly newRecoveryPrivateKey: string;
    
    /***            ****            ***/

    private constructor (
        operation: RecoverOperationModel
    ) {
        this.decentralized_identifier = operation.did;
        this.newUpdateKey = operation.newUpdateKey;
        this.newRecoveryKey = operation.newRecoveryKey;
        this.signedRequest = operation.signedRequest;
        this.privateKey = operation.privateKey;
        this.newUpdatePrivateKey = operation.newUpdatePrivateKey;
        this.newRecoveryPrivateKey = operation.newRecoveryPrivateKey;
    }

    /** Generates a Sidetree-based `DID-Recover` operation */
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
        
        /** Key-pair for the next DID-Upate operation */
        const [UPDATE_KEY, UPDATE_PRIVATE_KEY] = await Cryptography.keyPair();
        
        /** Key-pair for the next DID-Recover or Deactivate operation */
        const [RECOVERY_KEY, RECOVERY_PRIVATE_KEY] = await Cryptography.keyPair();
        
        /** Input data for the Sidetree-Tyron request */
        const REQUEST_INPUT: RequestInput = {
            did: input.did,
            recoveryPrivateKey: input.recoveryPrivateKey,
            publicKey: PUBLIC_KEYS,
            service: input.cliInput.service,
            newUpdateKey: UPDATE_KEY,
            newRecoveryKey: RECOVERY_KEY
        };

        /** Sidetree-Tyron data to generate a `DID-Recover` operation */
        const REQUEST = await DidRecover.sidetreeTyronRequest(REQUEST_INPUT);
        
        /** Output data from a Sidetree-Tyron `DID-Recover` operation */
        const OPERATION_OUTPUT: RecoverOperationModel = {
            did: input.did,
            newUpdateKey: UPDATE_KEY,
            newRecoveryKey: RECOVERY_KEY,
            signedRequest: REQUEST,
            privateKey: PRIVATE_KEYS,
            newUpdatePrivateKey: UPDATE_PRIVATE_KEY,
            newRecoveryPrivateKey: RECOVERY_PRIVATE_KEY   
        };
        return new DidRecover(OPERATION_OUTPUT);
    }

    /** Generates the Sidetree data for the `DID-Recover` operation */
    public static async sidetreeTyronRequest(input: RequestInput): Promise<SignedDataRequest> {
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
            update_key: input.newUpdateKey
        };
        const DELTA_BUFFER = Buffer.from(JSON.stringify(DELTA_OBJECT));
        const DELTA = Encoder.encode(DELTA_BUFFER);    
        const DELTA_HASH = Encoder.encode(Multihash.hash(DELTA_BUFFER));
        const PREVIOUS_RECOVERY_KEY = zcrypto.getPubKeyFromPrivateKey(input.recoveryPrivateKey);

        /** For the Recovery Operation Signed Data Object */
        const SIGNED_DATA: RecoverSignedDataModel = {
            decentralized_identifier: input.did,
            delta_hash: DELTA_HASH,
            previous_recovery_key: PREVIOUS_RECOVERY_KEY,
            new_recovery_key: input.newRecoveryKey
        };
        const DATA_BUFFER = Buffer.from(JSON.stringify(SIGNED_DATA));
        const SIGNATURE = zcrypto.sign(DATA_BUFFER, input.recoveryPrivateKey, PREVIOUS_RECOVERY_KEY);

        /** Data to execute a `DID-Recover` operation */
        const SIGNED_REQUEST: SignedDataRequest = {
            type: OperationType.Recover,
            signed_data: JSON.stringify(SIGNED_DATA),
            signature: SIGNATURE,
            delta: DELTA
        };
        return SIGNED_REQUEST;
    }
}

/***            ** interfaces **            ***/

/** Defines input data for a Sidetree-based `DID-Recover` operation */
export interface RecoverOperationInput {
    did: string;
    recoveryPrivateKey: string;
    cliInput: CliInputModel;
}

/** Defines output data of a Sidetree-based `DID-Recover` operation */
interface RecoverOperationModel {
    did: string;
    newUpdateKey: string;
    newRecoveryKey: string;
    signedRequest: SignedDataRequest;
    privateKey: string[];
    newUpdatePrivateKey: string;
    newRecoveryPrivateKey: string;
}

/** Defines input data for a Sidetree-based `DID-Recover` operation REQUEST*/
interface RequestInput {
    did: string;
    recoveryPrivateKey: string;
    publicKey: PublicKeyModel[];
    service?: ServiceEndpointModel[];
    newUpdateKey: string;
    newRecoveryKey: string;
}
