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
import { OperationType, Sidetree } from '../protocols/sidetree';
import { Cryptography, TyronPrivateKeys } from '../util/did-keys';
import { PatchModel } from '../protocols/models/document-model';
import DidState from '../did-state';
import { TransitionValue } from '../../blockchain/tyronzil';

/** Generates a `Tyron DID-Update` operation */
export default class DidUpdate{
    public readonly type = OperationType.Update;
    public readonly decentralized_identifier: string;
    public readonly newDocument: TransitionValue[];
    public readonly signature: string;
    public readonly newUpdateKey: string;
    public readonly privateKeys: TyronPrivateKeys;
    
    private constructor (
        operation: UpdateOperationModel
    ) {
        this.decentralized_identifier = operation.did;
        this.newDocument = operation.newDocument;
        this.signature = "0x"+ operation.signature;
        this.newUpdateKey = "0x"+ operation.newUpdateKey;
        this.privateKeys = operation.privateKeys;
    }

    /***            ****            ***/
    
    /** Generates a `Tyron DID-Update` operation with input from the CLI */
    public static async execute(input: UpdateOperationInput): Promise<DidUpdate> {
        const operation = await Sidetree.processPatches(input.patches)
        .then(async update => {
            const DOC_HASH = "0x" + sha256().update(update.updateDocument).digest('hex');
            
            const PREVIOUS_UPDATE_KEY = zcrypto.getPubKeyFromPrivateKey(input.updatePrivateKey);
            
            const SIGNATURE = zcrypto.sign(Buffer.from(DOC_HASH, 'hex'), input.updatePrivateKey, PREVIOUS_UPDATE_KEY);
            
            // Generates key-pair for the next DID-Update operation
            const [NEW_UPDATE_KEY, NEW_UPDATE_PRIVATE_KEY] = await Cryptography.keyPair("update");
            update.privateKeys.push(NEW_UPDATE_PRIVATE_KEY);

            const PRIVATE_KEYS = await Cryptography.processKeys(update.privateKeys);


            /** Output data from a Tyron `DID-Update` operation */
            const OPERATION_OUTPUT: UpdateOperationModel = {
                did: input.state.decentralized_identifier,
                newDocument: update.updateDocument,
                signature: SIGNATURE,
                newUpdateKey: NEW_UPDATE_KEY,
                privateKeys: PRIVATE_KEYS
            };
            return new DidUpdate(OPERATION_OUTPUT);
        })
        .catch(err => { throw err })
        return operation;
    }
}

/***            ** interfaces **            ***/

/** Defines input data for a `Tyron DID-Update` operation */
export interface UpdateOperationInput {
    state: DidState;
    updatePrivateKey: string;
    patches: PatchModel[];
}

/** Defines output data from a `Tyron DID-Update` operation */
interface UpdateOperationModel {
    did: string;
    newDocument: TransitionValue[];
    signature: string;
    newUpdateKey: string;
    privateKeys: TyronPrivateKeys;
}
