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
import { sha256 } from 'hash.js';
import { OperationType } from '../protocols/sidetree';
import { Cryptography, OperationKeyPairInput, TyronPrivateKeys } from '../util/did-keys';
import { CliInputModel } from '../../../bin/util';
import { TransitionValue } from '../../blockchain/tyronzil';
import { PrivateKeyModel } from '../protocols/models/verification-method-models';

/** Generates a `Tyron DID-Recover` operation */
export default class DidRecover {
    public readonly type = OperationType.Recover;
    public readonly decentralized_identifier: string;
    public readonly newDocument: TransitionValue[];
    public readonly signature: string;
    public readonly newUpdateKey: string;
    public readonly newRecoveryKey: string;
    public readonly privateKeys: TyronPrivateKeys;
    
    /***            ****            ***/

    private constructor (
        operation: RecoverOperationModel
    ) {
        this.decentralized_identifier = operation.did;
        this.newDocument = operation.newDocument;
        this.signature = "0x"+ operation.signature;
        this.newUpdateKey = "0x"+ operation.newUpdateKey;
        this.newRecoveryKey = "0x"+ operation.newRecoveryKey;
        this.privateKeys = operation.privateKeys;
    }

    /** Generates a `Tyron DID-Recover` operation */
    public static async execute(input: RecoverOperationInput): Promise<DidRecover> {
        const VERIFICATION_METHODS: TransitionValue[] = [];
        const PRIVATE_KEY_MODEL: PrivateKeyModel[] = [];

        const PUBLIC_KEY_INPUT = input.cliInput.publicKeyInput;
        for(const key_input of PUBLIC_KEY_INPUT) {
            // Creates the cryptographic key pair
            const KEY_PAIR_INPUT: OperationKeyPairInput = {
                id: key_input.id
            }
            const [VERIFICATION_METHOD, PRIVATE_KEY] = await Cryptography.operationKeyPair(KEY_PAIR_INPUT);
            VERIFICATION_METHODS.push(VERIFICATION_METHOD);
            PRIVATE_KEY_MODEL.push(PRIVATE_KEY);
        }
        
        const DOCUMENT = VERIFICATION_METHODS.concat(input.cliInput.services);
        const DOC_HASH = "0x" + sha256().update(DOCUMENT).digest('hex');
            
        const DID_CONTRACT_OWNER = zcrypto.getPubKeyFromPrivateKey(input.recoveryPrivateKey!);
            
        const SIGNATURE = zcrypto.sign(Buffer.from(DOC_HASH, 'hex'), input.recoveryPrivateKey!, DID_CONTRACT_OWNER);
        
        /** Key-pair for the next DID-Upate operation */
        const [UPDATE_KEY, UPDATE_PRIVATE_KEY] = await Cryptography.keyPair("update");
        PRIVATE_KEY_MODEL.push(UPDATE_PRIVATE_KEY);

        /** Key-pair for the next DID-Recover or Deactivate operation */
        const [RECOVERY_KEY, RECOVERY_PRIVATE_KEY] = await Cryptography.keyPair("recovery");
        PRIVATE_KEY_MODEL.push(RECOVERY_PRIVATE_KEY);

        const PRIVATE_KEYS = await Cryptography.processKeys(PRIVATE_KEY_MODEL);
        
        /** Output data from a Tyron `DID-Recover` operation */
        const OPERATION_OUTPUT: RecoverOperationModel = {
            did: input.did,
            newDocument: DOCUMENT,
            signature: SIGNATURE,
            newUpdateKey: UPDATE_KEY,
            newRecoveryKey: RECOVERY_KEY,
            privateKeys: PRIVATE_KEYS 
        };
        return new DidRecover(OPERATION_OUTPUT);
    }
}

/***            ** interfaces **            ***/

/** Defines input data for a `Tyron DID-Recover` operation */
export interface RecoverOperationInput {
    did: string;
    recoveryPrivateKey: string;
    cliInput: CliInputModel;
}

/** Defines output data from a `Tyron DID-Recover` operation */
interface RecoverOperationModel {
    did: string;
    newDocument: TransitionValue[];
    signature: string;
    newUpdateKey: string;
    newRecoveryKey: string;
    privateKeys: TyronPrivateKeys;
}
