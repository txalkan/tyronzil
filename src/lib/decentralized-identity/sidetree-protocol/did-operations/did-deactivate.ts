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
import DeactivateOperation from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/DeactivateOperation';
import JwkEs256k from '@decentralized-identity/sidetree/dist/lib/core/models/JwkEs256k';
import { Cryptography } from '../../util/did-keys';
import { DeactivateSignedDataModel } from '../models/signed-data-models';

/** Generates a Sidetree-based `DID-deactivate` operation */
export default class DidDeactivate {
    public readonly type = OperationType.Deactivate;
    public readonly did_tyronZIL: string;
    public readonly sidetreeRequest: Buffer;
    public readonly deactivateOperation: DeactivateOperation;
    
    /***            ****            ***/

    private constructor (
        operation: DeactivateOperationModel
    ) {
        this.did_tyronZIL = operation.did_tyronZIL;
        this.sidetreeRequest = operation.sidetreeRequest;
        this.deactivateOperation = operation.deactivateOperation;
    }

    /** Generates a Sidetree-based `DID-deactivate` operation */
    public static async execute(input: DeactivateOperationInput): Promise<DidDeactivate> {
        
        /** For the Deactivate Operation Signed Data Object */
        const SIGNED_DATA: DeactivateSignedDataModel = {
            did_suffix: input.did_tyronZIL,
            recovery_key: Cryptography.getPublicKey(input.recoveryPrivateKey),
        };
        const SIGNED_DATA_JWS = await Cryptography.signUsingEs256k(SIGNED_DATA, input.recoveryPrivateKey);
        
        /** DID data to generate a Sidetree DeactivateOperation */
        const SIDETREE_REQUEST: SignedDataRequest = {
            did_suffix: input.did_tyronZIL,
            signed_data: SIGNED_DATA_JWS,
            type: OperationType.Deactivate
        };

        const SIDETREE_REQUEST_BUFFER = Buffer.from(JSON.stringify(SIDETREE_REQUEST));
              
        /** Executes the Sidetree DeactivateOperation */
        const DEACTIVATE_OPERATION = await DeactivateOperation.parse(SIDETREE_REQUEST_BUFFER);
        
        /** Output data from a Sidetree-based `DID-deactivate` operation */
        const OPERATION_OUTPUT: DeactivateOperationModel = {
            did_tyronZIL: input.did_tyronZIL,
            sidetreeRequest: SIDETREE_REQUEST_BUFFER,
            deactivateOperation: DEACTIVATE_OPERATION,    
        };
        return new DidDeactivate(OPERATION_OUTPUT);
    }
}

/***            ** interfaces **            ***/

/** Defines input data for a Sidetree-based `DID-deactivate` operation */
export interface DeactivateOperationInput {
    did_tyronZIL: string;
    recoveryPrivateKey: JwkEs256k;
}

/** Defines output data of a Sidetree-based `DID-deactivate` operation */
interface DeactivateOperationModel {
    did_tyronZIL: string;
    sidetreeRequest: Buffer;
    deactivateOperation: DeactivateOperation;
}

/** Defines data for a Sidetree DeactivateOperation REQUEST*/
interface SignedDataRequest {
    did_suffix: string,
    signed_data: string;
    type: OperationType.Deactivate
}
