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

import { Cryptography, OperationKeyPairInput } from '../util/did-keys';
import { DocumentModel } from '../sidetree-protocol/models/document-model';
import { CliInputModel } from '../../../bin/util';
import { OperationType } from '../sidetree-protocol/sidetree';

/** Generates a Tyron `DID-Recover` operation */
export default class DidRecover {
    public readonly type = OperationType.Recover;
    public readonly decentralized_identifier: string;
    public readonly newDocument: string;
    public readonly signature: string;
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
        this.newDocument = "0x"+ operation.newDocument;
        this.signature = "0x"+ operation.signature;
        this.newUpdateKey = "0x"+ operation.newUpdateKey;
        this.newRecoveryKey = "0x"+ operation.newRecoveryKey;
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
            PRIVATE_KEYS.push(PRIVATE_KEY);
        }

        /** The Sidetree Document Model */
        const DOCUMENT: DocumentModel = {
            public_keys: PUBLIC_KEYS,
            service_endpoints: input.cliInput.service,
        };
        const DOC_HEX = Buffer.from(JSON.stringify(DOCUMENT)).toString('hex');;
        
        const PREVIOUS_RECOVERY_KEY = zcrypto.getPubKeyFromPrivateKey(input.recoveryPrivateKey);

        const SIGNATURE = zcrypto.sign(Buffer.from(DOC_HEX, 'hex'), input.recoveryPrivateKey, PREVIOUS_RECOVERY_KEY);
        
        /** Key-pair for the next DID-Upate operation */
        const [UPDATE_KEY, UPDATE_PRIVATE_KEY] = await Cryptography.keyPair();
        
        /** Key-pair for the next DID-Recover or Deactivate operation */
        const [RECOVERY_KEY, RECOVERY_PRIVATE_KEY] = await Cryptography.keyPair();
        
        /** Output data from a Tyron `DID-Recover` operation */
        const OPERATION_OUTPUT: RecoverOperationModel = {
            did: input.did,
            newDocument: DOC_HEX,
            signature: SIGNATURE,
            newUpdateKey: UPDATE_KEY,
            newRecoveryKey: RECOVERY_KEY,
            privateKey: PRIVATE_KEYS,
            newUpdatePrivateKey: UPDATE_PRIVATE_KEY,
            newRecoveryPrivateKey: RECOVERY_PRIVATE_KEY   
        };
        return new DidRecover(OPERATION_OUTPUT);
    }
}

/***            ** interfaces **            ***/

/** Defines input data for a Tyron `DID-Recover` operation */
export interface RecoverOperationInput {
    did: string;
    recoveryPrivateKey: string;
    cliInput: CliInputModel;
}

/** Defines output data from a Tyron `DID-Recover` operation */
interface RecoverOperationModel {
    did: string;
    newDocument: string;
    signature: string;
    newUpdateKey: string;
    newRecoveryKey: string;
    privateKey: string[];
    newUpdatePrivateKey: string;
    newRecoveryPrivateKey: string;
}
