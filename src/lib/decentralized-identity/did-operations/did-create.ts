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
import { Cryptography, OperationKeyPairInput } from '../util/did-keys';
import { CliInputModel } from '../../../bin/util';
import { DocumentModel } from '../sidetree-protocol/models/document-model';

/** Generates a `Tyron DID-Create` operation
 *  which produces the `DID-Document` & metadata */
export default class DidCreate {
    public readonly type = OperationType.Create;
    public readonly document: string;
    
    /** The public key corresponding to the contract_owner */
    public readonly didContractOwner: string;
    public readonly signature: string;
    public readonly updateKey: string;
    public readonly recoveryKey: string;
    public readonly privateKey: string[];
    public readonly updatePrivateKey: string;
    public readonly recoveryPrivateKey: string;
    
    /***            ****            ***/

    private constructor (
        operation: CreateOperationModel
    ) {
        this.document = "0x"+ operation.document;
        this.didContractOwner = "0x" + operation.didContractOwner;
        this.signature = "0x" + operation.signature;
        this.updateKey = "0x"+ operation.updateKey;
        this.recoveryKey = "0x"+ operation.recoveryKey;
        this.privateKey = operation.privateKey;
        this.updatePrivateKey = operation.updatePrivateKey;
        this.recoveryPrivateKey = operation.recoveryPrivateKey;
    }

    /***            ****            ***/
   
    /** Generates a Tyron `DID-Create` operation with input from the CLI */
    public static async execute(input: CliInputModel): Promise<DidCreate> {
        const PUBLIC_KEYS = [];
        const PRIVATE_KEYS = [];

        const PUBLIC_KEY_INPUT = input.publicKeyInput;
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
            service_endpoints: input.service
        };
        
        const DOC_HEX = Buffer.from(JSON.stringify(DOCUMENT)).toString('hex');
            
        const DID_CONTRACT_OWNER = zcrypto.getPubKeyFromPrivateKey(input.userPrivateKey!);
            
        const SIGNATURE = zcrypto.sign(Buffer.from(DOC_HEX, 'hex'), input.userPrivateKey!, DID_CONTRACT_OWNER);
            
        // Creates the update key-pair (necessary for the next update operation)
        const [UPDATE_KEY, UPDATE_PRIVATE_KEY] = await Cryptography.keyPair();
        
        // Creates the recovery key-pair (necessary for next recovery or deactivate operation)
        const [RECOVERY_KEY, RECOVERY_PRIVATE_KEY] = await Cryptography.keyPair();
        
        /** Output data from a Tyron `DID-Create` operation */
        const OPERATION_OUTPUT: CreateOperationModel = {
            document: DOC_HEX,
            didContractOwner: DID_CONTRACT_OWNER,
            signature: SIGNATURE,
            updateKey: UPDATE_KEY,
            recoveryKey: RECOVERY_KEY,
            privateKey: PRIVATE_KEYS,
            updatePrivateKey: UPDATE_PRIVATE_KEY,
            recoveryPrivateKey: RECOVERY_PRIVATE_KEY  
        };
        return new DidCreate(OPERATION_OUTPUT);
    }
}

/***            ** interfaces **            ***/

/** Defines output data for a Sidetree-based `DID-Create` operation */
interface CreateOperationModel {
    document: string;
    didContractOwner: string;
    signature: string;
    updateKey: string;
    recoveryKey: string;
    privateKey: string[];
    updatePrivateKey: string;
    recoveryPrivateKey: string;
}
