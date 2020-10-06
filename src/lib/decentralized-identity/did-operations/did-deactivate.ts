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
import { OperationType } from '../sidetree-protocol/sidetree';
import DidState from '../did-state';

/** Generates a `Tyron DID-Deactivate` operation */
export default class DidDeactivate {
    public readonly type = OperationType.Deactivate;
    public readonly decentralized_identifier: string;
    public readonly signature: string;
    
    /***            ****            ***/

    private constructor (
        operation: DeactivateOperationModel
    ) {
        this.decentralized_identifier = operation.did;
        this.signature = "0x"+ operation.signature;
    }

    /** Generates a Sidetree-based `DID-Deactivate` operation */
    public static async execute(input: DeactivateOperationInput): Promise<DidDeactivate> {
        const TYRON_HASH = input.state.tyron_hash.substring(2);
        const PREVIOUS_RECOVERY_KEY = zcrypto.getPubKeyFromPrivateKey(input.recoveryPrivateKey);

        const SIGNATURE = zcrypto.sign(Buffer.from(TYRON_HASH, 'hex'), input.recoveryPrivateKey, PREVIOUS_RECOVERY_KEY);
        
        /** Output data from a Tyron `DID-Deactivate` operation */
        const OPERATION_OUTPUT: DeactivateOperationModel = {
            did: input.state.decentralized_identifier,
            signature: SIGNATURE 
        };
        return new DidDeactivate(OPERATION_OUTPUT);
    }
}

/***            ** interfaces **            ***/

/** Defines input data for a `Tyron DID-Deactivate` operation */
export interface DeactivateOperationInput {
    state: DidState;
    recoveryPrivateKey: string;
}

/** Defines output data from a `Tyron DID-Deactivate` operation */
interface DeactivateOperationModel {
    did: string;
    signature: string;
}
