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

import { OperationType } from '../protocols/sidetree';
import { Cryptography, OperationKeyPairInput, TyronPrivateKeys } from '../util/did-keys';
import { CliInputModel } from '../../../bin/util';
import { TransitionValue } from '../../blockchain/tyronzil';
import { PrivateKeyModel } from '../protocols/models/verification-method-models';

/** Generates a `Tyron DID-Create` operation
 *  which produces the `DID-Document` & metadata */
export default class DidCreate {
    public readonly type = OperationType.Create;
    public readonly document: TransitionValue[];
    public readonly updateKey: string;
    public readonly recoveryKey: string;
    public readonly privateKeys: TyronPrivateKeys;
    
    /***            ****            ***/

    private constructor (
        operation: CreateOperationModel
    ) {
        this.document = operation.document;
        this.updateKey = "0x"+ operation.updateKey;
        this.recoveryKey = "0x"+ operation.recoveryKey;
        this.privateKeys = operation.privateKeys;
    }

    /***            ****            ***/
   
    /** Generates a Tyron `DID-Create` operation with input from the CLI */
    public static async execute(input: CliInputModel): Promise<DidCreate> {
        const VERIFICATION_METHODS: TransitionValue[] = [];
        const PRIVATE_KEY_MODEL: PrivateKeyModel[] = [];

        for(const key_input of input.publicKeyInput) {
            // Creates the cryptographic key pair
            const KEY_PAIR_INPUT: OperationKeyPairInput = {
                id: key_input.id
            }
            const [VERIFICATION_METHOD, PRIVATE_KEY] = await Cryptography.operationKeyPair(KEY_PAIR_INPUT);
            VERIFICATION_METHODS.push(VERIFICATION_METHOD);
            PRIVATE_KEY_MODEL.push(PRIVATE_KEY);
        }

        const DOCUMENT = VERIFICATION_METHODS.concat(input.services);
            
        // Creates the update key-pair (necessary for the next update operation)
        const [UPDATE_KEY, UPDATE_PRIVATE_KEY] = await Cryptography.keyPair("update");
        PRIVATE_KEY_MODEL.push(UPDATE_PRIVATE_KEY);

        // Creates the recovery key-pair (necessary for next recovery or deactivate operation)
        const [RECOVERY_KEY, RECOVERY_PRIVATE_KEY] = await Cryptography.keyPair("recovery");
        PRIVATE_KEY_MODEL.push(RECOVERY_PRIVATE_KEY);

        const PRIVATE_KEYS = await Cryptography.processKeys(PRIVATE_KEY_MODEL);
        
        /** Output data from a Tyron `DID-Create` operation */
        const OPERATION_OUTPUT: CreateOperationModel = {
            document: DOCUMENT,
            updateKey: UPDATE_KEY,
            recoveryKey: RECOVERY_KEY,
            privateKeys: PRIVATE_KEYS
        };
        return new DidCreate(OPERATION_OUTPUT);
    }
}

/***            ** interfaces **            ***/

/** Defines output data for a Sidetree-based `DID-Create` operation */
interface CreateOperationModel {
    document: TransitionValue[];
    updateKey: string;
    recoveryKey: string;
    privateKeys: TyronPrivateKeys;
}
