/*
    SSI Protocol's client for Node.js
    Self-Sovereign Identity Protocol.
    Copyright (C) Tyron Pungtas and its affiliates.

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
import * as fs from 'fs';
import LogColors from './log-colors';
import * as readline from 'readline-sync';
import * as tyron from 'tyron';

export default class Util {

    /** Generates the keys' input */
    public static async InputKeys(): Promise<PublicKeyInput[]> {
        console.log(LogColors.brightGreen(`Cryptographic keys for your Decentralized Identifier: `))
        
        const KEY_ID_SET: Set<string> = new Set();
        const KEY_INPUT = [];
        
        console.log(LogColors.brightGreen(`You can have a key for each of the following purposes:
        General(1),
        Authentication(2),
        Assertion(3),
        Agreement(4),
        Invocation(5), &
        Delegation(6)`));

        const amount = readline.question(LogColors.green(`How many of them would you like to add?`) + ` - up to [6] - ` + LogColors.lightBlue(`Your answer: `));
        if(Number(amount)> 6) {
            throw new tyron.ErrorCode.default("IncorrectAmount", "You may only have up to 6 keys, one for each purpose")
        }
        for(let i=0, t= Number(amount); i<t; ++i) {
            const id = readline.question(LogColors.green(`Next, choose your key purpose`) + ` - [1/2/3/4/5/6] - ` + LogColors.lightBlue(`Your answer: `));
            if (id === "") {
                throw new tyron.ErrorCode.default("InvalidID", `To register a key you must provide a valid purpose`);
            }
            let PURPOSE;
            switch (Number(id)) {
                case 1:
                    PURPOSE = tyron.VerificationMethods.PublicKeyPurpose.General;
                    break;
                case 2:
                    PURPOSE = tyron.VerificationMethods.PublicKeyPurpose.Auth;
                    break;
                case 3:
                    PURPOSE = tyron.VerificationMethods.PublicKeyPurpose.Assertion;
                    break;
                case 4:
                    PURPOSE = tyron.VerificationMethods.PublicKeyPurpose.Agreement;
                    break;
                case 5:
                    PURPOSE = tyron.VerificationMethods.PublicKeyPurpose.Invocation;
                    break;
                case 6:
                    PURPOSE = tyron.VerificationMethods.PublicKeyPurpose.Delegation;
                    break;
                default:
                    throw new tyron.ErrorCode.default("InvalidID", `To register a key you must provide a valid purpose`);
            }
            const KEY: PublicKeyInput = {
                id: PURPOSE
            }

            // IDs MUST be unique
            if(KEY_ID_SET.has(id)) {
                throw new tyron.ErrorCode.default("DuplicatedID", "The key IDs MUST NOT be duplicated");
            }
            KEY_ID_SET.add(id);
            KEY_INPUT.push(KEY);
        }
        return KEY_INPUT;
    }

    /** Generates DID services */
    public static async services(): Promise<tyron.DocumentModel.ServiceModel[]> {
        console.log(LogColors.brightGreen(`Service endpoints for your Decentralized Identifier:`));
        const SERVICES: tyron.DocumentModel.ServiceModel[] = [];
        const SERVICE_ID_SET: Set<string> = new Set();
        
        const amount = readline.question(LogColors.green(`How many services would you like to add? - `) + LogColors.lightBlue(`Your answer: `));
        if(!Number(amount) && Number(amount) !== 0 || Number(amount) < 0) {
            throw new tyron.ErrorCode.default("WrongAmount", "It must be a number greater than or equal to 0");
        }
        for(let i=0, t= Number(amount); i<t; ++i) {
            const id = readline.question(LogColors.green(`What is the service ID? - `) + LogColors.lightBlue(`Your answer: `));
            if (id === "") {
                throw new tyron.ErrorCode.default("Invalid parameter", "To register a DID service, you must provide its ID.");
            }
            const type = readline.question(LogColors.green(`What is the service type? - `) + ` - website[1] or address [2]' - ` + LogColors.lightBlue(`Your answer: `));
            let TYPE;
            let data_transfer;
            switch (type) {
                case '1':
                    TYPE = "website";
                    const data_transfer_ = readline.question(LogColors.green(`What is the data transfer protocol? https(1) or git(2)`) + ` - [1/2] - ` + LogColors.lightBlue(`Your answer: `));
                    switch (Number(data_transfer_)) {
                        case 1:
                            data_transfer = tyron.DocumentModel.TransferProtocol.Https;
                            break;
                        case 2:
                            data_transfer = tyron.DocumentModel.TransferProtocol.Git;
                            break;
                        default:
                            throw new tyron.ErrorCode.default("InvalidInput", `That input in not allowed`);
                    }
                    const uri = readline.question(LogColors.green(`What is the service URI?`) + ` - [yourwebsite.com] - ` + LogColors.lightBlue(`Your answer: `));
                    if (uri === "") {
                        throw new tyron.ErrorCode.default("Invalid parameter", "To register this DID service, you must provide its URI.");
                    }
                    // IDs MUST be unique
                    if(!SERVICE_ID_SET.has(id)) {
                        SERVICE_ID_SET.add(id);
                        const service: tyron.DocumentModel.ServiceModel = {
                            id: id,
                            endpoint: tyron.DocumentModel.ServiceEndpoint.Web2Endpoint,
                            type: TYPE,
                            transferProtocol: data_transfer,
                            uri: uri
                        };
                        SERVICES.push(service);
                    } else {            
                        throw new tyron.ErrorCode.default("CodeDocumentServiceIdDuplicated", "The service IDs MUST NOT be duplicated" );
                    }
                    break;
                case '2':
                    let address = readline.question(LogColors.green(`What is the service URI?`) + ` - [yourwebsite.com] - ` + LogColors.lightBlue(`Your answer: `));
                    if( address === "" ){
                        throw new tyron.ErrorCode.default("Invalid parameter", "To register this DID service, you must provide its address.");
                    }
                    try {
                        address = zcrypto.toChecksumAddress(address);
                    } catch (error) {
                        throw error
                    }
                    // IDs MUST be unique
                    if(!SERVICE_ID_SET.has(id)) {
                        SERVICE_ID_SET.add(id);
                        const service: tyron.DocumentModel.ServiceModel = {
                            id: id,
                            endpoint: tyron.DocumentModel.ServiceEndpoint.Web3Endpoint,
                            address: address
                        };
                        SERVICES.push(service);
                    } else {            
                        throw new tyron.ErrorCode.default("CodeDocumentServiceIdDuplicated", "The service IDs MUST NOT be duplicated" );
                    }
                    break;
            }
            
            

            
        }
        return SERVICES;
    }

    /** Saves the private keys */
    public static async savePrivateKeys(did: string, keys: tyron.DidKeys.DIDVerificationMethods): Promise<void> {
        const KEY_FILE_NAME = `DID_PRIVATE_KEYS_${did}.json`;
        fs.writeFileSync(KEY_FILE_NAME, JSON.stringify(keys, null, 2));
        console.info(LogColors.yellow(`Private keys saved as: ${LogColors.brightYellow(KEY_FILE_NAME)}`));
    }

    /** Verifies that the given key matches the DID key of the smart contracts (DID update key OR DID recovery key) */
    public static async verifyKey(privateKey: string, didKey: string): Promise<void> {
        const PUB_KEY = "0x"+ zcrypto.getPubKeyFromPrivateKey(privateKey);
        if(PUB_KEY === didKey) {
            console.log(LogColors.brightGreen(`Success! The private key corresponds to the public DID key stored in the smart contract.`));
        } else {
            throw new tyron.ErrorCode.default("WrongKey", "The given key is not matching the corresponding key in the smart contract.")
        }
    }
}
  
export interface PublicKeyInput {
    id: tyron.VerificationMethods.PublicKeyPurpose;
}
