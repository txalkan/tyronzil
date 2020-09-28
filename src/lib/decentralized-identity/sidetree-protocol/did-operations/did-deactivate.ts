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

import OperationType from '@decentralized-identity/sidetree/dist/lib/core/enums/OperationType';
import { DeactivateSignedDataModel, SignedDataRequest } from '../models/signed-data-models';

/** Generates a Sidetree-based `DID-Deactivate` operation */
export default class DidDeactivate {
    public readonly type = OperationType.Deactivate;
    public readonly decentralized_identifier: string;
    public readonly signedRequest: SignedDataRequest;
    
    /***            ****            ***/

    private constructor (
        operation: DeactivateOperationModel
    ) {
        this.decentralized_identifier = operation.did;
        this.signedRequest = operation.signedRequest
    }

    /** Generates a Sidetree-based `DID-Deactivate` operation */
    public static async execute(input: DeactivateOperationInput): Promise<DidDeactivate> {
        const PREVIOUS_RECOVERY_KEY = zcrypto.getPubKeyFromPrivateKey(input.recoveryPrivateKey);

        /** For the Deactivate Operation Signed Data Object */
        const SIGNED_DATA: DeactivateSignedDataModel = {
            decentralized_identifier: input.did,
            previous_recovery_key: PREVIOUS_RECOVERY_KEY
        };
        const DATA_BUFFER = Buffer.from(JSON.stringify(SIGNED_DATA));
        const SIGNATURE = zcrypto.sign(DATA_BUFFER, input.recoveryPrivateKey, PREVIOUS_RECOVERY_KEY);

        /** Data to execute a `DID-Deactivate` operation */
        const SIGNED_REQUEST: SignedDataRequest = {
            type: OperationType.Deactivate,
            signed_data: JSON.stringify(SIGNED_DATA),
            signature: SIGNATURE
        };

        /** Output data from a Sidetree-Tyron `DID-Deactivate` operation */
        const OPERATION_OUTPUT: DeactivateOperationModel = {
            did: input.did,
            signedRequest: SIGNED_REQUEST   
        };
        return new DidDeactivate(OPERATION_OUTPUT);
    }
}

/***            ** interfaces **            ***/

/** Defines input data for a Sidetree-based `DID-Deactivate` operation */
export interface DeactivateOperationInput {
    did: string;
    recoveryPrivateKey: string;
}

/** Defines output data of a Sidetree-based `DID-Deactivate` operation */
interface DeactivateOperationModel {
    did: string;
    signedRequest: SignedDataRequest;
}
